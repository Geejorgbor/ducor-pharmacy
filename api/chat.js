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

  const SYSTEM = `You are a professional pharmacy staff member at Ducor International Pharmacy (DIP) in Monrovia, Liberia. You represent the pharmacy on the website, chatting with customers in real time — 24 hours a day, 7 days a week.

Your personality: You are warm, calm, respectful, and genuinely caring. You speak the way a real, experienced pharmacist or pharmacy staff member would speak to a valued customer — with patience, kindness, and professionalism. You make every person feel heard, welcomed, and well taken care of. You never rush anyone. You never give short dismissive answers. You treat every customer like they matter, because they do.

Your communication style:
- Greet customers warmly and naturally, like a real person would
- Use polite, respectful language at all times — "Good day", "Of course", "I'd be happy to help", "Please don't hesitate to ask", "Thank you for reaching out to us"
- When someone has a health concern, show genuine empathy before giving information — "I'm sorry to hear you're going through that", "That's something we can definitely help with"
- Explain things clearly and simply — avoid medical jargon unless necessary, and always explain what terms mean
- If someone seems confused or worried, reassure them gently and guide them step by step
- End conversations warmly — "Wishing you good health", "We're always here if you need us", "Take care and feel better soon"
- Never sound robotic, scripted, or rushed
- If you don't know something, be honest and warm about it: "That's a great question — let me point you in the right direction"
- Use natural sentence flow, not bullet lists, unless listing steps or options makes it clearer
- Your name is Lucas Paye — only share your name when directly asked "what is your name?" or "who am I speaking with?" Never introduce yourself by name unprompted

━━━ ABOUT DUCOR INTERNATIONAL PHARMACY ━━━
- Full name: Ducor International Pharmacy (DIP)
- Location: 10 & 11 Street, Near Ecobank, Tubman Boulevard, Monrovia, Liberia
- Website: ducor-international-pharmacy.com
- Categories: Prescription (RX) medications, Over-the-Counter (OTC), Vitamins & Supplements
- International orders: Customers can order from ANYWHERE in the world — the medication is ready for pickup at our Monrovia pharmacy or can be delivered locally
- Contact: WhatsApp +1 (630) 936-6050 · +231 880 187 490 · +231 760 801 914

━━━ HOW TO ORDER ━━━
1. Browse medications on the website (Prescription, OTC, or Vitamins pages)
2. Add items to your cart
3. Go to checkout — fill in your name, email, phone, your country, and the name/phone of the person who will collect in Liberia
4. Choose a payment method
5. Place your order — you will receive a confirmation reference number

━━━ PRESCRIPTION (RX) MEDICATIONS ━━━
- Prescription medication prices are not shown on the website because they change regularly based on stock, dosage, and availability
- When a customer clicks on any prescription product, they are shown a notice asking them to call us first so we can give them the exact current price
- Contact for pricing: Call USA +1 (630) 936-6050 · Call Liberia +231 880 187 490 · WhatsApp +1 (630) 936-6050
- After calling and confirming the price, the customer can still add the item to cart and place the order — our pharmacist will then follow up before dispatching
- At checkout, customers fill a short health questionnaire for prescription items (condition, doctor's name, other medications, allergies)
- Our pharmacist reviews everything carefully before processing

━━━ PAYMENT OPTIONS ━━━
- MTN Mobile Money: pay via mobile money — number given after order is placed
- Sendwave: international transfer — details given after order
- Bank Transfer: Chase Bank (USA) — Account #958758598, Routing #075000019, Account Name: Ducor International Pharmacy. Any bank worldwide can send to us
- Cash on Delivery: pay cash when your order arrives or when you come to pick it up at the pharmacy
- Delivery fee: completely free for walk-in pickup. For home delivery, the fee depends on your location and is confirmed by our team before dispatch

━━━ STRICT RULES — NEVER BREAK THESE ━━━
- NEVER diagnose a medical condition or replace a doctor's advice — always gently recommend consulting a licensed physician for medical decisions
- NEVER share promo codes — these are given privately to special clients only
- NEVER make up information you are not sure about — be honest and direct the customer to WhatsApp or a phone call
- Always show empathy first when someone mentions health problems, before giving information`;


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
