// Vercel serverless function — welcomes new members who join Lucas's real
// wholesale WhatsApp group, with a strong, special greeting.
//
// Branding note: this group is PharMed Consultant Liberia, the WHOLESALE
// business — separate from Ducor International Pharmacy (the retail
// website). Per Lucas, never brand these messages as "Ducor".
//
// There's no real-time "member joined" webhook in Green API, so this polls:
// it reads the group's current participant list, compares it against the
// last-known list (stored in a small private GitHub repo, auto-created on
// first run), and if it finds anyone new, posts a welcome naming them in
// the group. On the very first run ever, it just saves today's member list
// as the starting point — it does NOT welcome everyone already in the
// group as if they were new.
//
// Triggered on the same schedule as post-group-update.js — see
// .github/workflows/whatsapp-group-post.yml.
//
// SETUP — env vars already in place from earlier setup:
//   GROUP_POST_SECRET (auth), GREEN_API_URL/ID/TOKEN (WhatsApp),
//   GH_STATE_TOKEN (GitHub PAT with "repo" scope — this function uses it to
//   auto-create a new PRIVATE repo, Geejorgbor/ducor-pharmacy-state, and
//   store the member list there. Private on purpose: phone numbers are
//   personal info and shouldn't sit in the public ducor-pharmacy repo.)

const CLIENT_GROUP_CHAT_ID = '120363425756994007@g.us';
const STATE_OWNER = 'Geejorgbor';
const STATE_REPO = 'ducor-pharmacy-state';
const STATE_FILE = 'group-members.json';

async function ghRequest(path, token, options = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

async function ensureStateRepo(token) {
  const check = await ghRequest(`/repos/${STATE_OWNER}/${STATE_REPO}`, token);
  if (check.status === 200) return;
  if (check.status !== 404) throw new Error(`GitHub repo check failed: ${check.status}`);
  const create = await ghRequest('/user/repos', token, {
    method: 'POST',
    body: JSON.stringify({
      name: STATE_REPO,
      private: true,
      description: 'Private state storage for Ducor Pharmacy automations — no website code here.',
      auto_init: true,
    }),
  });
  if (!create.ok) throw new Error(`GitHub repo create failed: ${create.status}`);
}

// Returns { ids, sha, isFirstRun }. isFirstRun is true only when the state
// file has never been written before — that's the signal to seed quietly
// instead of "welcoming" the entire existing group.
async function readState(token) {
  const res = await ghRequest(`/repos/${STATE_OWNER}/${STATE_REPO}/contents/${STATE_FILE}`, token);
  if (res.status === 404) return { ids: [], sha: null, isFirstRun: true };
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  const json = await res.json();
  const content = Buffer.from(json.content, 'base64').toString('utf8');
  return { ids: JSON.parse(content), sha: json.sha, isFirstRun: false };
}

async function writeState(token, ids, sha) {
  const body = {
    message: 'Update known WhatsApp group members',
    content: Buffer.from(JSON.stringify(ids, null, 2)).toString('base64'),
  };
  if (sha) body.sha = sha;
  const res = await ghRequest(`/repos/${STATE_OWNER}/${STATE_REPO}/contents/${STATE_FILE}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub write failed: ${res.status}`);
}

async function sendWhatsApp(apiUrl, id, token, message, chatId) {
  const response = await fetch(`${apiUrl}/waInstance${id}/sendMessage/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });
  const data = await response.json();
  return { ok: response.ok && !!data.idMessage, data };
}

function displayNameFor(participant) {
  const raw = (participant.id || '').split('@')[0];
  return raw ? `+${raw}` : 'our newest partner';
}

function buildWelcomeMessage(newParticipants) {
  const names = newParticipants.map(displayNameFor).join(', ');
  return [
    '🎉🔥 A WARM PHARMED CONSULTANT LIBERIA WELCOME! 🔥🎉',
    '',
    `Everyone please join us in welcoming our newest member(s): ${names}! 👏`,
    '',
    'You are now part of a trusted family of pharmacies, medicine stores, and clinics across Liberia — real stock, real prices, real partnership. We are proud to have you with us. 🙌',
    '',
    'PharMed Consultant Liberia — Monrovia, Liberia 🇱🇷',
  ].join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const secret = req.headers['x-cron-secret'];
  if (!process.env.GROUP_POST_SECRET || secret !== process.env.GROUP_POST_SECRET) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const API_URL = process.env.GREEN_API_URL;
  const ID = process.env.GREEN_API_ID;
  const TOKEN = process.env.GREEN_API_TOKEN;
  const GH_TOKEN = process.env.GH_STATE_TOKEN;
  if (!API_URL || !ID || !TOKEN) {
    return res.status(200).json({ ok: false, error: 'WhatsApp not configured yet' });
  }
  if (!GH_TOKEN) {
    return res.status(200).json({ ok: false, error: 'GH_STATE_TOKEN not configured yet' });
  }

  try {
    const groupResp = await fetch(`${API_URL}/waInstance${ID}/getGroupData/${TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: CLIENT_GROUP_CHAT_ID }),
    });
    const group = await groupResp.json();
    const participants = group.participants || [];
    const currentIds = participants.map((p) => p.id).filter(Boolean);

    await ensureStateRepo(GH_TOKEN);
    const { ids: knownIds, sha, isFirstRun } = await readState(GH_TOKEN);

    let welcomeResult = null;
    let newIds = [];

    if (!isFirstRun) {
      newIds = currentIds.filter((id) => !knownIds.includes(id));
      if (newIds.length > 0) {
        const newParticipants = participants.filter((p) => newIds.includes(p.id));
        const message = buildWelcomeMessage(newParticipants);
        welcomeResult = await sendWhatsApp(API_URL, ID, TOKEN, message, CLIENT_GROUP_CHAT_ID);
      }
    }

    // Always save the current full list, whether first run, no change, or
    // new members found — so someone who leaves and rejoins later gets
    // welcomed again correctly.
    await writeState(GH_TOKEN, currentIds, sha);

    return res.status(200).json({ ok: true, isFirstRun, newMembers: newIds, welcomeResult });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
};
