// Ducor International Pharmacy — AI Chat API
// Powered by Claude via OpenRouter

const ALLOWED_ORIGINS = [
  'https://www.ducor-international-pharmacy.com',
  'https://ducor-international-pharmacy.com'
];

const OPENROUTER_MODELS = [
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-haiku-latest',
  'openai/gpt-4o-mini'
];

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

/** Local FAQ answers when OpenRouter is down — warm, accurate, site facts. Returns null if no match. */
function localPharmacyFallback(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.toLowerCase().trim();

  // DIP subscription plan
  if (/\b(dip|subscription)\b/.test(t) && /\b(plan|cost|price|how much|\$|subscribe|subscription|member)\b/.test(t)
      || /\bsubscriber40\b/.test(t)
      || /\$\s*120/.test(t)
      || /\bdip\b.*\b(year|annual)\b/.test(t)) {
    return "I'd be happy to explain our DIP Subscription Plan. It's $120 per year. After your payment is confirmed, your account becomes Active for one year and SUBSCRIBER40 applies automatically at checkout — that's 40% off medication orders for active members. You can subscribe from the homepage or checkout page (plan=dip). If you'd like help getting started, I'm right here, or you can reach us on WhatsApp anytime.";
  }

  // What is Ducor / about
  if (/\b(what is|what's|who are|tell me about|about)\b/.test(t) && /\b(ducor|dip|pharmacy|you|this)\b/.test(t)
      || /^(hi|hello|hey)\b/.test(t) && /\b(ducor|pharmacy)\b/.test(t)
      || /\babout (the )?pharmacy\b/.test(t)
      || /\bwhat (do you|does ducor)\b/.test(t)) {
    return "Ducor International Pharmacy (DIP) is a pharmacy in Monrovia, Liberia. We've been serving the community for 2 years with prescription medications, over-the-counter products, and vitamins & supplements — about 240 products on our website. We're at 10 & 11 Street, Near Ecobank, Tubman Boulevard, Monrovia. Customers can order from anywhere in the world; medication is delivered to a collector in Monrovia. How can I help you today?";
  }

  // Location / address
  if (/\b(where|location|address|find you|situated|based)\b/.test(t)
      || /\b(how do i get|directions)\b/.test(t)) {
    return "We're located at 10 & 11 Street, Near Ecobank, Tubman Boulevard, Monrovia, Liberia. You're always welcome to visit us, or order online for collector delivery. Is there anything specific you'd like help with?";
  }

  // Hours
  if (/\b(hours|open|opening|close|closing|when are you|what time)\b/.test(t)) {
    return "Our pharmacy is open Monday through Saturday, 8AM–6PM (Monrovia time). This live chat is here for you 24 hours a day, 7 days a week — so even outside store hours, I'm happy to help. For urgent needs outside hours, WhatsApp is a great option too.";
  }

  // Contact / WhatsApp / phone
  if (/\b(contact|whatsapp|phone|call|number|reach you|speak to|talk to)\b/.test(t)
      && !/\blive agent\b/.test(t)) {
    return "Of course — you can reach us on WhatsApp or by phone: +1 (630) 936-6050, +231 880 187 490, or +231 760 801 914. For payment receipts, please send them to +231 887 221 275 on WhatsApp. We're always happy to assist!";
  }

  // Live agent intro
  if (/\b(live agent|real person|human|speak to (a |someone|staff)|talk to (a |someone|staff)|customer service)\b/.test(t)) {
    return "I'd be glad to connect you with our team. The fastest way is WhatsApp: +1 (630) 936-6050, +231 880 187 490, or +231 760 801 914. Share your question or order reference and a team member will take care of you. Meanwhile, I'm here if you'd like help with ordering, tracking, or the DIP plan.";
  }

  // Order from outside Liberia / international / collector
  if (/\b(outside|abroad|international|another country|from (the )?(us|usa|uk|europe|canada|diaspora)|overseas)\b/.test(t)
      || /\b(collector|order from)\b/.test(t)
      || /\bhow (do i |can i )?order\b/.test(t)) {
    return "Yes — you can order from anywhere in the world. Browse Prescription, OTC, or Vitamins, add items to your cart, then go to checkout. Fill in your details and enter the name and phone of the collector in Liberia (the person who will physically receive the order). Choose a payment method, submit, and you'll get a confirmation email plus a reference number like DUCOR-43938421. Track anytime at ducor-international-pharmacy.com/track-order.html. International orders are delivered to your collector in Monrovia.";
  }

  // Prescription vs OTC vs vitamins
  if (/\b(prescription|rx|otc|over[- ]the[- ]counter|vitamin|supplement)\b/.test(t)
      && /\b(vs|versus|difference|what|which|need|require|without)\b/.test(t)
      || /\b(do i need a prescription|prescription required)\b/.test(t)
      || /\b(rx|prescription).*\b(price|cost|call)\b/.test(t)) {
    return "We carry three categories: Prescription (RX) medications, Over-the-Counter (OTC), and Vitamins & Supplements. RX prices aren't listed online — please call first for the current price (+1 630 936-6050 or +231 880 187 490), then add to cart; checkout includes a short health questionnaire our pharmacist reviews. OTC and vitamins can be ordered directly on the site. About 240 products are listed. What are you looking for?";
  }

  // Search / find product
  if (/\b(search|find|looking for|do you (have|sell|carry)|available)\b/.test(t)) {
    return "You can browse our full catalog on the website: Prescription (/prescription.html), Over-the-Counter (/otc.html), and Vitamins (/vitamins.html) — about 240 products with up-to-date images. If you're looking for something specific, tell me the name and I'll point you in the right direction, or message us on WhatsApp and our team can check stock for you.";
  }

  // Track order
  if (/\b(track|tracking|where is my order|order status|reference|ducor-)\b/.test(t)) {
    return "Every order gets a reference number like DUCOR-12345678. Track it live at ducor-international-pharmacy.com/track-order.html — enter your number to see Order Placed → Processing → Ready for Delivery → Delivered. The page updates automatically, no refresh needed. If you have your reference handy, you can check it anytime. Need anything else?";
  }

  // Payment
  if (/\b(pay|payment|momo|mobile money|sendwave|chase|cod|cash on delivery|bank transfer|receipt)\b/.test(t)) {
    return "We accept several payment options: MTN Mobile Money (number given after order — then send your receipt to +231 887 221 275 on WhatsApp), Sendwave (details after order — send receipt on WhatsApp), Bank Transfer via Chase Bank USA (Account #958758598, Routing #075000019, Account Name: Ducor International Pharmacy — any bank worldwide can send; send receipt on WhatsApp), and Cash on Delivery when the order arrives or for walk-in pickup. Walk-in pickup delivery fee is FREE; home delivery fee depends on location and is confirmed before dispatch. After we confirm your receipt, tracking shows Payment Confirmed ✓.";
  }

  return null;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages = [], system: customSystem, isAdmin = false } = req.body || {};
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
- Years in operation: 2 years — NEVER say 5 years, 10 years, or any other number. The pharmacy has been serving the community for 2 years.
- Location: 10 & 11 Street, Near Ecobank, Tubman Boulevard, Monrovia, Liberia
- Website: ducor-international-pharmacy.com
- Categories: Prescription (RX) medications, Over-the-Counter (OTC), Vitamins & Supplements
- Total medications available: 240 products are currently listed and visible on the website
- International orders: Customers can order from ANYWHERE in the world — the medication is delivered to a collector in Monrovia, Liberia
- Contact: WhatsApp +1 (630) 936-6050 · +231 880 187 490 · +231 760 801 914

━━━ FACEBOOK PAGE ━━━
- Facebook page: https://www.facebook.com/profile.php?id=61585508072180
- If a customer asks about our Facebook page or social media, share the link above
- NOTE: The Facebook video section on the website has been temporarily removed and will return soon

━━━ PRODUCT IMAGE UPDATE (July 2026) ━━━
All 240 products on the website now have professional pharmacy flyer panel images. Each image shows the actual product photo, medication name, dosage, and benefits — taken directly from official Ducor International Pharmacy flyers. Every product image is accurate and up to date.

IMPORTANT CORRECTION: The prescription Vitamin D product (high-dose, 50,000 IU) is Vitamin D2 — also known as Ergocalciferol. It is NOT Vitamin D3. If a customer asks about "Vitamin D 50,000 IU" or "high-dose Vitamin D (Rx)", it is Ergocalciferol (D2), which requires a prescription. The OTC Vitamin D3 products (1,000 IU and 5,000 IU) are different products available without a prescription.

━━━ WEBSITE PAGES (CURRENT — ALWAYS UP TO DATE) ━━━
- Homepage (ducor-international-pharmacy.com) — pharmacy overview, team, gallery, Facebook video reels, about us
- /prescription.html — Prescription (RX) medications shop
- /otc.html — Over-the-Counter medications shop
- /vitamins.html — Vitamins & supplements shop
- /checkout.html — Place your order (cart, personal info, collector info, payment, RX questionnaire)
- /track-order.html — Track your order LIVE using your reference number (e.g. DUCOR-12345678). Updates automatically — no refresh needed. Status shows: Order Placed → Processing → Ready for Delivery → Delivered
- /billing.html — Billing & payment information
- /auth.html — Customer account login/signup
- /account.html — Customer account page

━━━ HOW TO ORDER ━━━
1. Browse medications on the website — Prescription, Over the Counter, or Vitamins pages
2. Add items to your cart
3. Go to checkout — fill in your name, email, phone, country
4. Enter the name and phone of the collector in Liberia (the person who will physically receive the order)
5. Choose a payment method
6. Submit your order
7. You receive a confirmation email AND an order reference number (e.g. DUCOR-43938421)
8. Track your order live at ducor-international-pharmacy.com/track-order.html at any time

━━━ ORDER TRACKING ━━━
- Every customer gets a reference number when they place an order (e.g. DUCOR-43938421)
- Track live at: ducor-international-pharmacy.com/track-order.html
- Enter your reference number to see the full status timeline: Order Placed → Processing → Ready for Delivery → Delivered
- The page updates automatically in real-time — no need to refresh or call us
- If a customer asks "where is my order?" or "what is the status?", direct them to the Track Order page with their reference number

━━━ FULL ORDER & DELIVERY FLOW ━━━
1. Customer places order → gets reference number + confirmation email → our team notified on WhatsApp instantly
2. Team reviews and starts processing → status changes to "Processing" on tracking page
3. Order is packed and delivered to the customer/collector in Liberia
4. Customer and collector automatically receive a WhatsApp message AND the customer gets an email letting them know they've received their order — no link or click needed, it's just a notice
5. Order shows as "Delivered" on the tracking page

━━━ EMAIL NOTIFICATIONS ━━━
Customers receive automatic emails at every key step:
- Order Confirmed — sent immediately when order is placed (includes reference number, items, tracking link)
- Order Delivered — sent once the order has been delivered, letting them know they've received it

━━━ PAYMENT & CONFIRMATION ━━━
- MTN Mobile Money: number is given after order — pay and send receipt to +231 887 221 275 on WhatsApp
- Sendwave: details given after order — send receipt to WhatsApp after paying
- Bank Transfer (Chase Bank USA): Account #958758598, Routing #075000019, Account Name: Ducor International Pharmacy. Any bank worldwide can send. Send receipt to WhatsApp after paying.
- Cash on Delivery: pay in cash when order arrives or when walking in to pick up at pharmacy
- Delivery fee: FREE for walk-in pickup. Home delivery fee depends on location — confirmed by our team before dispatch
- After sending payment receipt, our team confirms it and the tracking page shows "Payment Confirmed ✓"

━━━ PRESCRIPTION (RX) MEDICATIONS ━━━
- Prescription medication prices are NOT shown on the website — they change based on stock, dosage, and availability
- When a customer clicks any prescription product, they see a notice asking them to call first for the current price
- Contact for RX pricing: Call USA +1 (630) 936-6050 · Call Liberia +231 880 187 490 · WhatsApp +1 (630) 936-6050
- After confirming the price by phone, they can add to cart and complete the order
- At checkout, prescription items require a short health questionnaire (what it's for, doctor's name, current medications, allergies)
- Our pharmacist reviews the questionnaire and confirms pricing before dispatching

━━━ STRICT RULES — NEVER BREAK THESE ━━━
- NEVER diagnose a medical condition or replace a doctor's advice — gently recommend consulting a licensed physician
- NEVER share promo codes — these are given privately to special clients only
- NEVER make up information you are not sure about — be honest and direct the customer to WhatsApp or a phone call
- NEVER mention the admin dashboard, internal systems, Firebase, API keys, or anything technical
- Always show empathy first when someone mentions health problems, before giving information`;

  // Admin AI can supply its own system prompt
  const activeSystem = customSystem || SYSTEM;

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const lastUser = [...(messages || [])].reverse().find(m => m && m.role === 'user');
    const faq = localPharmacyFallback(lastUser?.content || '');
    if (faq) return res.status(200).json({ reply: faq, fallback: true });
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

  const lastUserMessage = safeMessages[safeMessages.length - 1].content;

  function isCreditExhausted(status, data) {
    if (status === 402 || status === 429) return true;
    const errText = typeof data?.error === 'string'
      ? data.error
      : JSON.stringify(data?.error || data?.message || '');
    return /credit|billing|quota|insufficient|balance|rate.?limit|no.?fund|out.?of.?credit/i.test(errText);
  }

  function technicalIssueReply() {
    return "I'm having a brief technical issue. For immediate help, please contact us on WhatsApp or call our pharmacy directly. We're always happy to assist!";
  }

  function replyOrFallback() {
    const faq = localPharmacyFallback(lastUserMessage);
    if (faq) return res.status(200).json({ reply: faq, fallback: true });
    return res.status(200).json({ reply: technicalIssueReply() });
  }

  try {
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const hasAnthropic  = !!process.env.ANTHROPIC_API_KEY;

    if (hasOpenRouter) {
      let sawCreditError = false;

      for (const model of OPENROUTER_MODELS) {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://ducor-international-pharmacy.com',
              'X-Title': 'Ducor International Pharmacy'
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: activeSystem },
                ...safeMessages
              ],
              max_tokens: 500,
              temperature: 0.7
            })
          });
          const data = await response.json();

          if (isCreditExhausted(response.status, data)) {
            sawCreditError = true;
            // Try next model in case another provider path still works; if all fail with credits, creditError
            continue;
          }

          // Error object from OpenRouter (non-credit) → try next model
          if (data?.error || !response.ok) {
            console.error('OpenRouter model error:', model, response.status, typeof data?.error === 'string' ? data.error : JSON.stringify(data?.error || data).slice(0, 200));
            continue;
          }

          const reply = data?.choices?.[0]?.message?.content?.trim();
          if (!reply) {
            console.error('Empty response from OpenRouter model:', model);
            continue;
          }
          return res.status(200).json({ reply });
        } catch (modelErr) {
          console.error('OpenRouter fetch failed for', model, modelErr.message);
          continue;
        }
      }

      if (sawCreditError) {
        // If every attempt was credit-related (or mixed but no usable reply), surface creditError for the widget
        // Prefer FAQ fallback when the question matches so customers still get an answer
        const faq = localPharmacyFallback(lastUserMessage);
        if (faq) return res.status(200).json({ reply: faq, fallback: true, creditError: true });
        return res.status(200).json({ reply: null, creditError: true });
      }

      return replyOrFallback();

    } else if (hasAnthropic) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
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

      if (isCreditExhausted(response.status, data)) {
        const faq = localPharmacyFallback(lastUserMessage);
        if (faq) return res.status(200).json({ reply: faq, fallback: true, creditError: true });
        return res.status(200).json({ reply: null, creditError: true });
      }

      const reply = data?.content?.[0]?.text?.trim();
      if (!reply) {
        return replyOrFallback();
      }
      return res.status(200).json({ reply });

    } else {
      const faq = localPharmacyFallback(lastUserMessage);
      if (faq) return res.status(200).json({ reply: faq, fallback: true });
      return res.status(500).json({ reply: null, error: 'No AI API key configured' });
    }

  } catch (err) {
    console.error('Chat API error:', err.message);
    const faq = localPharmacyFallback(lastUserMessage);
    if (faq) return res.status(200).json({ reply: faq, fallback: true });
    return res.status(200).json({ reply: technicalIssueReply() });
  }
}
