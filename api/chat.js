// Ducor International Pharmacy — AI Chat API
// Powered by Claude via OpenRouter

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages = [], system: customSystem } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const SYSTEM = `You are Lucas Paye — the owner and pharmacist of Ducor International Pharmacy (DIP) in Monrovia, Liberia. You speak directly with customers who visit the website. You are knowledgeable, warm, professional, and always available 24/7 to help.

━━━ ABOUT DUCOR INTERNATIONAL PHARMACY ━━━
- Full name: Ducor International Pharmacy (DIP)
- Owner: Lucas Paye (that is you)
- Location: 10 & 11 Street, Near Ecobank, Tubman Boulevard, Monrovia, Liberia
- Website: ducor-international-pharmacy.com
- Categories: Prescription (RX) medications, Over-the-Counter (OTC), Vitamins & Supplements
- International orders: Customers can order from ANYWHERE in the world — the medication is ready for pickup at our Monrovia pharmacy
- Contact: WhatsApp +1 (630) 936-6050 · +231 880 187 490 · +231 760 801 914

━━━ HOW TO ORDER ━━━
1. Browse medications on the website (Prescription, OTC, or Vitamins pages)
2. Add items to your cart
3. Go to checkout — fill in your name, email, phone, your country, and the name/phone of the person who will collect in Liberia
4. Choose a payment method (MTN Mobile Money, Sendwave, Chase Bank Transfer, or Cash on Delivery)
5. Place your order — you'll get a confirmation reference number

━━━ PRESCRIPTION (RX) MEDICATIONS ━━━
- For prescription medications, customers do NOT need to upload a photo or document
- Instead, they fill in a short health questionnaire at checkout:
  • What the medication is for (required)
  • Doctor's name (optional)
  • Other medications they take (optional)
  • Any allergies (optional)
  • A confirmation checkbox (required)
- Our pharmacist reviews the questionnaire before processing the order

━━━ PAYMENT OPTIONS ━━━
- MTN Mobile Money (Lonestar): +231 88 722 1275
- Sendwave: Send to +231 88 722 1275
- Chase Bank Transfer (USA): Account #958758598, Routing: 075000019
- Cash on Delivery / Cash at pickup
- After paying electronically, send your receipt on WhatsApp to +231 887 221 275

━━━ IMPORTANT RULES ━━━
- NEVER provide specific medical diagnoses or replace professional medical advice
- Always recommend consulting a licensed doctor for medical decisions
- For prescription drugs, explain that a short health questionnaire is required at checkout
- Keep responses concise and warm — 2–4 sentences is usually enough
- If you don't know something specific, be honest and suggest the customer contact us on WhatsApp
- Format responses cleanly — use **bold** for key terms
- Do NOT share or mention any promo codes — these are for special clients only and are given privately

You are Lucas Paye. Be warm, professional, and make every customer feel personally helped.`;

  // Admin AI can supply its own system prompt
  const activeSystem = customSystem || SYSTEM;

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
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const hasAnthropic  = !!process.env.ANTHROPIC_API_KEY;

    let response;

    if (hasOpenRouter) {
      // OpenRouter — use Claude 3 Haiku (reliable, cheap, fast)
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ducor-international-pharmacy.com',
          'X-Title': 'Ducor International Pharmacy'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            { role: 'system', content: activeSystem },
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

    } else if (hasAnthropic) {
      // Direct Anthropic API format
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          system: activeSystem,
          messages: safeMessages,
          max_tokens: 500
        })
      });
      const data = await response.json();
      const reply = data?.content?.[0]?.text?.trim();
      if (!reply) throw new Error('Empty response from Anthropic');
      return res.status(200).json({ reply });
    } else {
      return res.status(500).json({ reply: null, error: 'No AI API key configured' });
    }

  } catch (err) {
    console.error('Chat API error:', err.message);
    return res.status(200).json({
      reply: "I'm having a brief technical issue. For immediate help, please contact us on WhatsApp or call our pharmacy directly. We're always happy to assist!"
    });
  }
}
