// Vercel serverless function — sends SMS via Africa's Talking
// API key stays server-side, never exposed to browser

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { phone, code, name } = req.body || {};

  if (!phone || !code) {
    return res.status(400).json({ ok: false, error: 'Phone and code required' });
  }

  const AT_USER   = process.env.AT_USERNAME;
  const AT_KEY    = process.env.AT_API_KEY;
  const AT_SENDER = process.env.AT_SENDER_ID || 'DUCOR';

  if (!AT_USER || !AT_KEY) {
    return res.status(500).json({ ok: false, error: 'SMS service not configured' });
  }

  const message = `Ducor Pharmacy: Your password reset code is ${code}. Expires in 15 minutes. Do not share it.`;

  try {
    const params = new URLSearchParams({
      username: AT_USER,
      to:       phone,
      message,
      from:     AT_SENDER,
    });

    const r = await fetch('https://api.africastalking.com/version1/messaging', {
      method:  'POST',
      headers: {
        apiKey:         AT_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept:         'application/json',
      },
      body: params.toString(),
    });

    const data = await r.json();
    const status = data?.SMSMessageData?.Recipients?.[0]?.status || 'Unknown';

    if (r.ok && status !== 'InvalidPhoneNumber') {
      return res.status(200).json({ ok: true, status });
    } else {
      return res.status(400).json({ ok: false, error: status });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
