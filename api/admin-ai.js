/**
 * Ducor Admin AI — authenticated server-side tool execution.
 *
 * POST /api/admin-ai
 *   Authorization: Bearer <Firebase ID token>
 *   Body: { messages: [{role, content}, ...] }
 *
 * Requires email in ADMIN_EMAILS (same allowlist as assets/admin-auth.js /
 * firestore.rules). Ignores any client-supplied system prompt.
 * Executes website ops via server tools (orders, products, live chat, etc.)
 * so actions work even when the dashboard tab is closed.
 */
import { verifyAdminBearer } from './lib/verify-admin.js';
import { ADMIN_SYSTEM, TOOL_DEFINITIONS, executeTool } from './lib/admin-ai-tools.js';
import { bridgeConfigured } from './lib/firestore-bridge.js';

const ALLOWED_ORIGINS = [
  'https://www.ducor-international-pharmacy.com',
  'https://ducor-international-pharmacy.com',
];

const OPENROUTER_MODELS = [
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-haiku-latest',
  'openai/gpt-4o-mini',
];

const ADMIN_MAX_TOKENS = 4000;
const MAX_TOOL_ROUNDS = 8;

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

function isCreditExhausted(status, data) {
  if (status === 402 || status === 429) return true;
  const errText = typeof data?.error === 'string'
    ? data.error
    : JSON.stringify(data?.error || data?.message || '');
  return /credit|billing|quota|insufficient|balance|rate.?limit|no.?fund|out.?of.?credit/i.test(errText);
}

function sanitizeMessages(messages) {
  return (messages || [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-24)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
}

async function callOpenRouter(model, messages, tools) {
  const body = {
    model,
    messages: [{ role: 'system', content: ADMIN_SYSTEM }, ...messages],
    max_tokens: ADMIN_MAX_TOKENS,
    temperature: 0.4,
  };
  if (tools && tools.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ducor-international-pharmacy.com',
      'X-Title': 'Ducor Admin AI',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data };
}

async function callAnthropic(messages, tools) {
  const body = {
    model: 'claude-haiku-4-5-20251001',
    system: ADMIN_SYSTEM,
    messages,
    max_tokens: ADMIN_MAX_TOKENS,
  };
  if (tools && tools.length) {
    body.tools = tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data };
}

function openRouterToolCalls(choiceMsg) {
  const calls = choiceMsg?.tool_calls;
  if (!Array.isArray(calls) || !calls.length) return [];
  return calls.map((c) => ({
    id: c.id || `call_${Date.now()}`,
    name: c.function?.name || c.name,
    args: (() => {
      try {
        return typeof c.function?.arguments === 'string'
          ? JSON.parse(c.function.arguments || '{}')
          : c.function?.arguments || c.arguments || {};
      } catch {
        return {};
      }
    })(),
  }));
}

function anthropicToolUses(data) {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks
    .filter((b) => b.type === 'tool_use')
    .map((b) => ({ id: b.id, name: b.name, args: b.input || {} }));
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth gate (required) ──────────────────────────────────────────────────
  const auth = await verifyAdminBearer(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  // Ignore ANY client system prompt / isAdmin flag — fixed server prompt only.
  const { messages: rawMessages = [] } = req.body || {};
  const safeMessages = sanitizeMessages(rawMessages);
  if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'messages array required; last message must be from user' });
  }

  if (!bridgeConfigured()) {
    return res.status(503).json({
      error: 'Firestore bridge not configured — set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_BRIDGE_PASSWORD',
    });
  }

  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  if (!hasOpenRouter && !hasAnthropic) {
    return res.status(500).json({ error: 'AI service not configured', reply: null });
  }

  const tools = TOOL_DEFINITIONS;
  const executed = [];
  let working = [...safeMessages];
  let finalReply = '';
  let creditError = false;
  let modelUsed = null;

  try {
    if (hasOpenRouter) {
      let sawCredit = false;
      let done = false;

      for (const model of OPENROUTER_MODELS) {
        if (done) break;
        working = [...safeMessages];
        executed.length = 0;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          let response, data;
          try {
            ({ response, data } = await callOpenRouter(model, working, tools));
          } catch (e) {
            console.error('OpenRouter admin-ai fetch failed', model, e.message);
            break;
          }

          if (isCreditExhausted(response.status, data)) {
            sawCredit = true;
            break;
          }
          if (data?.error || !response.ok) {
            console.error('OpenRouter admin-ai error', model, response.status, JSON.stringify(data?.error || data).slice(0, 200));
            break;
          }

          const choiceMsg = data?.choices?.[0]?.message;
          if (!choiceMsg) {
            console.error('Empty admin-ai response', model);
            break;
          }

          modelUsed = model;
          const calls = openRouterToolCalls(choiceMsg);

          if (calls.length) {
            // Append assistant tool-call turn
            working.push({
              role: 'assistant',
              content: choiceMsg.content || null,
              tool_calls: choiceMsg.tool_calls,
            });
            for (const call of calls) {
              const result = await executeTool(call.name, call.args, { adminEmail: auth.email });
              executed.push({ tool: call.name, args: call.args, result });
              working.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify(result),
              });
            }
            continue; // next round with tool results
          }

          finalReply = (choiceMsg.content || '').trim();
          done = true;
          break;
        }

        if (done && finalReply) break;
        if (sawCredit) continue;
      }

      if (!finalReply && sawCredit) creditError = true;
    } else if (hasAnthropic) {
      // Anthropic Messages API tool loop
      working = safeMessages.map((m) => ({ role: m.role, content: m.content }));
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const { response, data } = await callAnthropic(working, tools);
        if (isCreditExhausted(response.status, data)) {
          creditError = true;
          break;
        }
        const uses = anthropicToolUses(data);
        const textParts = (data?.content || []).filter((b) => b.type === 'text').map((b) => b.text);
        if (uses.length) {
          working.push({ role: 'assistant', content: data.content });
          const toolResults = [];
          for (const call of uses) {
            const result = await executeTool(call.name, call.args, { adminEmail: auth.email });
            executed.push({ tool: call.name, args: call.args, result });
            toolResults.push({
              type: 'tool_result',
              tool_use_id: call.id,
              content: JSON.stringify(result),
            });
          }
          working.push({ role: 'user', content: toolResults });
          continue;
        }
        finalReply = textParts.join('\n').trim();
        modelUsed = 'anthropic/claude-haiku';
        break;
      }
    }
  } catch (err) {
    console.error('Admin AI error:', err.message);
    return res.status(500).json({ error: 'Admin AI failed: ' + err.message, reply: null });
  }

  if (creditError && !finalReply) {
    return res.status(200).json({
      reply: null,
      creditError: true,
      actions: executed,
      serverTools: true,
      admin: auth.email,
    });
  }

  if (!finalReply) {
    finalReply = executed.length
      ? 'Actions completed. See results below.'
      : "I couldn't generate a reply just now. Please try again.";
  }

  // Strip any leftover [DO:] tags — server tools are the source of truth.
  finalReply = finalReply.replace(/\[DO:[^\]]+\]/g, '').trim();

  const actionSummaries = executed.map((e) => ({
    tool: e.tool,
    ok: e.result?.ok !== false,
    summary: e.result?.summary || e.result?.error || JSON.stringify(e.result).slice(0, 200),
  }));

  return res.status(200).json({
    reply: finalReply,
    actions: actionSummaries,
    serverTools: true,
    model: modelUsed,
    admin: auth.email,
  });
}
