// Vercel serverless function — welcomes new members (by WhatsApp name,
// never by phone number) who join the two allowed PharMed WhatsApp groups, with a strong, special greeting.
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

// Only the two groups allowed by Lucas (shared allow-list + per-group
// contact numbers live in post-group-update.js — no new api/ file needed).
const { GROUPS } = require('./post-group-update.js');
const STATE_OWNER = 'Geejorgbor';
const STATE_REPO = 'ducor-pharmacy-state';
// The original client group keeps its existing state file so nobody already
// in it gets re-welcomed; other groups get their own file (seeded quietly on
// their first run).
function stateFileFor(chatId) {
  if (chatId === '120363425756994007@g.us') return 'group-members.json';
  return `group-members-${chatId.split('@')[0]}.json`;
}

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
async function readState(token, file) {
  const res = await ghRequest(`/repos/${STATE_OWNER}/${STATE_REPO}/contents/${file}`, token);
  if (res.status === 404) return { ids: [], sha: null, isFirstRun: true };
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  const json = await res.json();
  const content = Buffer.from(json.content, 'base64').toString('utf8');
  return { ids: JSON.parse(content), sha: json.sha, isFirstRun: false };
}

async function writeState(token, ids, sha, file) {
  const body = {
    message: 'Update known WhatsApp group members',
    content: Buffer.from(JSON.stringify(ids, null, 2)).toString('base64'),
  };
  if (sha) body.sha = sha;
  const res = await ghRequest(`/repos/${STATE_OWNER}/${STATE_REPO}/contents/${file}`, token, {
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

// A WhatsApp display name we can safely show. Rejects anything that is
// really just a phone number (so the raw number is never posted), strips
// WhatsApp formatting characters, trims overly long names.
function cleanName(raw) {
  let name = String(raw || '').replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim();
  if (!name) return null;
  const digits = name.replace(/\D/g, '');
  if (digits.length >= 6 && /^[\d\s+()\-.]+$/.test(name)) return null; // looks like a number
  if (!/\p{L}/u.test(name)) return null; // no letters at all
  if (name.length > 40) name = name.slice(0, 40).trim() + '…';
  return name;
}

// Looks up the member's WhatsApp name via Green API getContactInfo
// (contactName = saved in the PharMed phone's contacts, name = their
// WhatsApp profile/push name). Falls back to any name in the participant
// object. Returns null if nothing usable — never throws.
async function lookupName(apiUrl, id, token, participant) {
  const direct = cleanName(participant.name || participant.pushname || participant.contactName);
  if (direct) return direct;
  try {
    const r = await fetch(`${apiUrl}/waInstance${id}/getContactInfo/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: participant.id }),
    });
    const info = await r.json();
    return cleanName(info && info.contactName) || cleanName(info && info.name) || null;
  } catch {
    return null;
  }
}

function joinNames(names) {
  const bold = names.map((n) => `*${n}*`);
  if (bold.length <= 1) return bold[0] || '';
  return `${bold.slice(0, -1).join(', ')} and ${bold[bold.length - 1]}`;
}

// names: array of display names (null = unknown). Unknown members are
// greeted generically — the phone number is never shown.
function buildWelcomeMessage(names, { groupName, chatId, seed = Math.floor(Date.now() / 86400000) } = {}) {
  const cfg = GROUPS.find((g) => g.chatId === chatId) || GROUPS[GROUPS.length - 1];
  const group = groupName || cfg.fallbackName;
  const known = names.filter(Boolean);
  const unknownCount = names.length - known.length;
  let who;
  if (known.length && unknownCount) {
    who = `${joinNames(known)} and ${unknownCount === 1 ? 'one more new friend' : `${unknownCount} more new friends`}`;
  } else if (known.length) {
    who = joinNames(known);
  } else {
    who = unknownCount > 1 ? '*our new friends*' : '*our new friend*';
  }
  const plural = names.length > 1;

  const openers = [
    '🎉 *WELCOME TO THE FAMILY!* 🎉',
    '🌟 *A WARM PHARMED WELCOME!* 🌟',
    '🤝 *OUR FAMILY JUST GOT BIGGER!* 🤝',
  ];
  const greet = [
    `Everyone, please join us in welcoming ${who}! 👏👏`,
    `A big, warm hello to ${who} — we’re so glad you’re here! 💚`,
    `Say hello to ${who}, the newest member${plural ? 's' : ''} of *${group}*! 🙌`,
  ];
  const k = ((seed % 3) + 3) % 3;
  return [
    openers[k],
    '',
    greet[k],
    '',
    `You’re now part of *${group}* — a trusted network of pharmacies, medicine stores and clinics across Liberia. 🇱🇷`,
    '',
    '📦 Here you’ll get our *real in-stock updates* every morning, midday and evening — including every *new shipment* as soon as it arrives.',
    '',
    `📲 Questions or orders? Message us anytime: ${cfg.waLink}  (${cfg.phoneDisplay})`,
    '',
    '🏥 *PharMed Consultant Liberia* — Monrovia 🇱🇷',
  ].join('\n');
}

async function processGroup(API_URL, ID, TOKEN, GH_TOKEN, chatId) {
  const groupResp = await fetch(`${API_URL}/waInstance${ID}/getGroupData/${TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId: chatId }),
  });
  const group = await groupResp.json();
  const participants = group.participants || [];
  const currentIds = participants.map((p) => p.id).filter(Boolean);
  // Guard: an empty/failed lookup must not overwrite state (would cause a
  // mass re-welcome on the next run).
  if (currentIds.length === 0) {
    return { chatId, ok: false, error: 'No participants returned by getGroupData' };
  }
  const groupName = (typeof group.subject === 'string' && group.subject.trim()) || undefined;
  const file = stateFileFor(chatId);
  const { ids: knownIds, sha, isFirstRun } = await readState(GH_TOKEN, file);

  let welcomeResult = null;
  let newIds = [];
  if (!isFirstRun) {
    newIds = currentIds.filter((id) => !knownIds.includes(id));
    if (newIds.length > 0) {
      const newParticipants = participants.filter((p) => newIds.includes(p.id));
      const names = [];
      for (const p of newParticipants) names.push(await lookupName(API_URL, ID, TOKEN, p));
      const message = buildWelcomeMessage(names, { groupName, chatId });
      welcomeResult = await sendWhatsApp(API_URL, ID, TOKEN, message, chatId);
    }
  }
  // Always save the current full list, so someone who leaves and rejoins
  // later gets welcomed again correctly.
  await writeState(GH_TOKEN, currentIds, sha, file);
  return { chatId, ok: true, isFirstRun, newMembers: newIds.length, welcomeResult };
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
    await ensureStateRepo(GH_TOKEN);
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
  const groups = [];
  for (const { chatId } of GROUPS) {
    try {
      groups.push(await processGroup(API_URL, ID, TOKEN, GH_TOKEN, chatId));
    } catch (err) {
      groups.push({ chatId, ok: false, error: err.message });
    }
  }
  return res.status(200).json({ ok: groups.some((g) => g.ok), groups });
};

module.exports._test = { buildWelcomeMessage, cleanName, lookupName };
