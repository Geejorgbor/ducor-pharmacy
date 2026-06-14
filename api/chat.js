// Ducor International Pharmacy — AI Chat API
// Powered by Claude via OpenRouter

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages = [] } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const SYSTEM = `You are the AI Pharmacist for Ducor International Pharmacy (DIP) — Liberia's premier online pharmacy located in Monrovia, Liberia. You are knowledgeable, friendly, professional, and speak in a warm, helpful tone.

About Ducor International Pharmacy:
- Full name: Ducor International Pharmacy (DIP)
- Location: Monrovia, Liberia
- Website: ducor-international-pharmacy.com
- We sell: Prescription medications (RX), Over-the-counter (OTC) medicines, Vitamins & supplements
- Delivery: Available across Monrovia and surrounding areas
- Payment: Cash on delivery (COD) and online payment (Flutterwave)
- Prescription medications require a valid prescription from a licensed doctor
- Contact: Available via WhatsApp for urgent queries

What you can help with:
- Finding medications (search by name, condition, or category)
- Explaining medication uses, dosages (general info — NOT medical advice)
- Explaining how to place orders on our website
- Tracking order status (tell them to check their account page)
- Information about prescription requirements
- General pharmacy and health questions
- Delivery and payment information

Important rules:
- NEVER provide specific medical diagnoses or replace professional medical advice
- Always recommend consulting a licensed doctor for medical decisions
- If someone asks about a specific medication, explain general info but remind them to follow their doctor's prescription
- For prescription drugs, always state that a valid prescription is required
- Keep responses concise but thorough (2-4 sentences usually enough)
- If you don't know something specific about our inventory, be honest and suggest they contact us directly
- Format responses cleanly — use **bold** for key terms, avoid long bullet lists unless listing multiple items

You represent a professional, trusted pharmacy. Be warm but precise.`;

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured', reply: null });
  }

  // Sanitize messages - only keep role and content
  const safeMessages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (safeMessages.length === 0 || safeMessages[safeMessages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Last message must be from user' });
  }

  try {
    const isOpenRouter = (process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) || process.env.ANTHROPIC_BASE_URL?.includes('openrouter');
    const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
    const modelId = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'claude-haiku-4-5-20251001';

    let response;

    if (isOpenRouter || process.env.ANTHROPIC_BASE_URL?.includes('openrouter')) {
      // OpenRouter format
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ducor-international-pharmacy.com',
          'X-Title': 'Ducor International Pharmacy'
        },
        body: JSON.stringify({
          model: modelId.includes('/') ? modelId : `anthropic/${modelId}`,
          messages: [
            { role: 'system', content: SYSTEM },
            ...safeMessages
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });
      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error('Empty response from OpenRouter');
      return res.status(200).json({ reply });

    } else {
      // Direct Anthropic API format
      response = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          system: SYSTEM,
          messages: safeMessages,
          max_tokens: 500
        })
      });
      const data = await response.json();
      const reply = data?.content?.[0]?.text?.trim();
      if (!reply) throw new Error('Empty response from Anthropic');
      return res.status(200).json({ reply });
    }

  } catch (err) {
    console.error('Chat API error:', err.message);
    return res.status(200).json({
      reply: "I'm having a brief technical issue. For immediate help, please contact us on WhatsApp or call our pharmacy directly. We're always happy to assist!"
    });
  }
}
