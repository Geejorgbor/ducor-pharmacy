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
    return "Our pharmacy is open Monday through Saturday, 9AM–5PM (Monrovia time). This live chat is here for you 24 hours a day, 7 days a week — so even outside store hours, I'm happy to help. For urgent needs outside hours, WhatsApp is a great option too.";
  }

  // Contact / WhatsApp / phone
  if (/\b(contact|whatsapp|phone|call|number|reach you|speak to|talk to)\b/.test(t)
      && !/\blive agent\b/.test(t)) {
    return "Of course — you can reach us on WhatsApp or by phone: +1 (630) 936-6050, +231 880 187 490, or +231 760 801 914. For payment receipts, please send them to +231 887 221 275 on WhatsApp. We're always happy to assist!";
  }

  // Live agent intro (widget Talk to pharmacist starts handoff anytime; Lonestar WhatsApp alert)
  if (/\b(live agent|real person|human|speak to (a |someone|staff)|talk to (a |someone|staff)|customer service|pharmacist)\b/.test(t)) {
    return "I'd be glad to connect you with our team. Tap Talk to pharmacist in this chat to request a live handoff — a team member is notified on WhatsApp (desk hours Mon–Sat 9AM–5PM Monrovia; they may still reply after hours). You can also WhatsApp +1 (630) 936-6050, +231 880 187 490, or +231 760 801 914. Meanwhile, I'm here if you'd like help with ordering, tracking, or the DIP plan.";
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

  // Safety redirects — emergencies / Rx / dosing (before generic search)
  // Emergencies first — never suggest products
  if (/\b(chest pain|can'?t breathe|cannot breathe|severe (shortness of )?breath|uncontrolled bleeding|suicid|kill myself|overdose|stroke|seizure|unconscious|passed out)\b/.test(t)
      || /\b(emergency|911|ambulance)\b/.test(t)) {
    return "This sounds like it may be an emergency. Please go to the nearest hospital or call emergency services right away — do not wait on chat or try to treat this with over-the-counter products. We're here for non-emergency pharmacy questions, but your safety comes first.";
  }

  // Rx / antibiotics / controlled — redirect, no product push
  if (/\b(antibiotics?|amoxicillin|azithromycin|cipro|penicillin|flagyl|metronidazole)\b/.test(t)
      || /\b(prescription|rx)\b/.test(t) && /\b(need|want|buy|get|for)\b/.test(t)
      || /\b(blood pressure (medicine|medication|pill)|diabetes (medicine|medication|insulin)|controlled substance)\b/.test(t)) {
    return "I can't recommend antibiotics or any prescription medication over chat — those need a licensed doctor or our pharmacist. Please call or WhatsApp us (+1 630 936-6050 · +231 880 187 490) so our pharmacist can guide you, or visit us at 10 & 11 Street near Ecobank, Tubman Boulevard. This chat is not a substitute for professional medical advice.";
  }

  // Child dosing uncertainty
  if (/\b(baby|infant|toddler|child|kid|my (son|daughter))\b/.test(t)
      && /\b(dose|dosing|how much|how many|give|age|weight|months? old|years? old)\b/.test(t)) {
    return "For children's dosing, please speak with our pharmacist or a doctor so the dose matches the child's age and weight — I don't want to guess. Call or WhatsApp +1 630 936-6050 or +231 880 187 490, or visit us in Sinkor. You can browse Children's Acetaminophen and Children's Ibuprofen on our OTC page (otc.html) after a pharmacist confirms the right dose. This is not a substitute for professional medical advice.";
  }

  // Pregnancy-related risky
  if (/\b(pregnan|expecting|breastfeed|nursing)\b/.test(t)
      && /\b(medicine|medication|pill|take|safe|can i|what can)\b/.test(t)) {
    return "When you're pregnant or breastfeeding, please check with a doctor or our pharmacist before taking any medicine — even common OTC products. Call or WhatsApp +1 630 936-6050 or +231 880 187 490 and we'll help safely. This chat is not a substitute for professional medical advice.";
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


  // --- OTC symptom guidance (offline fallback; careful, non-diagnostic) ---

  // Vague illness — ask clarifying questions, do not dump meds
  if (/\b(i('?m| am) (sick|ill|unwell|not (feeling )?well)|don'?t feel (good|well)|feel(ing)? (bad|awful|terrible|off)|something('?s| is) wrong|what('?s| is) wrong with me|help me|not sure what (i have|it is)|i have (a )?(problem|issue|pain))\b/.test(t)
      && !/\b(headache|fever|cough|cold|flu|allerg|diarrhea|diarrhoea|heartburn|stomach|burn|sneeze|migraine|rash|vomit)\b/.test(t)) {
    return "I'm sorry you're not feeling well — let's narrow it down so I can point you to the right over-the-counter option. Quickly: (1) Where is the discomfort — head, throat, chest, stomach, or somewhere else? (2) How long has it lasted? (3) Any fever, or is it mild or getting worse? Once I know that, I'll suggest an exact product from our OTC shop you can buy without a prescription. If it feels severe or like an emergency, please see a doctor or go to hospital now.";
  }

  // Headache / mild fever (pain + fever OTC)
  if (/\b(headache|migraine|head (pain|ache))\b/.test(t)
      || (/\b(fever|temperature|hot)\b/.test(t) && /\b(mild|slight|low|headache|body|ache|pain|feel)\b/.test(t))
      || /\b(pain|ache).{0,40}\b(fever|temperature)\b/.test(t)
      || /\b(fever|temperature).{0,40}\b(pain|ache|headache)\b/.test(t)) {
    return "I'm sorry you're not feeling well. For a common headache with mild fever, many customers use Acetaminophen 500mg (extra strength) from our OTC shop — go to otc.html and search \"Acetaminophen 500mg\", or open product.html?id=otc003&cat=otc. Ibuprofen 200mg is another option if you prefer an anti-inflammatory (search \"Ibuprofen\" on otc.html). This is general wellness guidance, not a diagnosis — if fever is high, lasts more than a few days, or you feel much worse, please see a doctor or our pharmacist. Always follow the label.";
  }

  // Fever alone (mild framing)
  if (/\b(fever|high temperature|running a temperature)\b/.test(t)
      && !/\b(malaria|typhoid|severe|very high|104|40\s*c)\b/.test(t)) {
    return "For a common mild fever, Acetaminophen 500mg is a popular OTC choice in our shop — visit otc.html and search \"Acetaminophen\", or open product.html?id=otc003&cat=otc. Children's Acetaminophen is also listed if this is for a child (confirm dose with our pharmacist first). If fever is very high, lasts long, or comes with severe symptoms, please see a doctor right away. This is not a substitute for professional medical advice.";
  }

  // Cold / flu
  if (/\b(cold|flu|runny nose|stuffy|congestion|chills)\b/.test(t)
      && !/\b(antibiotic|malaria)\b/.test(t)) {
    return "Sounds like a common cold or flu-type discomfort. On our OTC page you can find Cold/Flu Capsules (search \"Cold/Flu\" on otc.html, or product.html?id=otc024&cat=otc), Daytime Cold/Flu Syrup, or Night Time Cold Relief Syrup. Acetaminophen 500mg helps with aches and fever too. This isn't a formal diagnosis — if breathing is hard, symptoms are severe, or it lasts a long time, please see a doctor or our pharmacist. Guidance only; follow the label.";
  }

  // Cough
  if (/\b(cough|coughing)\b/.test(t) && !/\b(blood|severe|can'?t breathe)\b/.test(t)) {
    return "For a common cough, we carry Guaifenesin DM Cough Liquid on the OTC shop — go to otc.html and search \"Guaifenesin\" or open product.html?id=otc029&cat=otc. Cold/Flu Capsules may also help if you have other cold symptoms. If the cough is severe, produces blood, or you struggle to breathe, seek medical care now. This is not a substitute for professional medical advice.";
  }

  // Allergy / hay fever / itchy eyes
  if (/\b(allerg|hay fever|itchy (eyes|skin)|sneezing|hives)\b/.test(t)
      && !/\b(anaphyla|throat (closing|swelling)|can'?t breathe)\b/.test(t)) {
    return "For common allergy symptoms, Cetirizine 10mg and Loratadine 10mg are both on our OTC shelf — go to otc.html and search \"Cetirizine\" or \"Loratadine\" (product.html?id=otc018&cat=otc or otc037). Diphenhydramine 25mg (Benadryl) is another option. Severe swelling, trouble breathing, or anaphylaxis needs emergency care immediately — no OTC first. This guidance isn't a diagnosis; ask our pharmacist if you're unsure.";
  }

  // Heartburn / acid / burning stomach after meals
  if (/\b(heartburn|acid reflux|indigestion)\b/.test(t)
      || /\b(stomach|chest).{0,30}\b(burn|burning|fire)\b/.test(t)
      || /\b(burn|burning).{0,30}\b(stomach|after meals|after eating)\b/.test(t)
      || /\b(sour stomach|acid stomach)\b/.test(t)) {
    return "I'm sorry your stomach is bothering you. For common heartburn or burning after meals, Omeprazole 20mg is in our OTC shop — visit otc.html and search \"Omeprazole\", or open product.html?id=otc051&cat=otc. Antacid 500mg Chewable Tabs or Maalox Antacid can also give quicker relief (search \"Antacid\" or \"Maalox\" on otc.html). This isn't a diagnosis — if pain is severe, you vomit blood, or it keeps coming back, please see a doctor. Always read the label; not a substitute for professional advice.";
  }

  // Diarrhea
  if (/\b(diarrhea|diarrhoea|loose stool|runny stomach)\b/.test(t)
      && !/\b(blood|severe|infant|baby|dehydrated)\b/.test(t)) {
    return "For common diarrhea, Loperamide (Imodium) 2mg is available on our OTC page — go to otc.html and search \"Loperamide\" or open product.html?id=otc036&cat=otc. Drink plenty of fluids. If there's blood, high fever, signs of dehydration, or it lasts more than a couple of days — especially in a child — please see a doctor or our pharmacist. This is general guidance only, not a diagnosis.";
  }

  // Gas / bloating
  if (/\b(gas|bloating|bloated|flatulence)\b/.test(t) && /\b(stomach|relief|help|medicine|medication|what can)\b/.test(t)
      || /\b(gas relief|too much gas)\b/.test(t)) {
    return "For everyday gas and bloating, Simethicone 80mg (Gas Relief) is on our OTC shop — search \"Simethicone\" on otc.html or open product.html?id=otc056&cat=otc. If pain is severe or lasting, please check with our pharmacist or a doctor. Not a substitute for professional medical advice.";
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

Your personality: You are a sharp, intelligent pharmacy assistant — warm Liberian hospitality mixed with confident, professional pharmacy knowledge. You think clearly, ask smart questions, and never waste the customer's time. You are caring without being wordy or robotic.

Your communication style:
- Sound smart and concise — short clear sentences, confident tone, no filler
- Warm Liberian pharmacy style: respectful, human, helpful — not corporate or scripted
- When someone has a health concern, one brief empathy line, then helpful substance
- Prefer plain language; explain any medical term in one short phrase if you must use it
- Never dump a long lecture or a list of medicines on a vague first message
- If you don't know something, say so briefly and point them to WhatsApp or the pharmacist
- Keep answers under ~150 words unless they ask for more
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

━━━ DIP SUBSCRIPTION PLAN ━━━
- DIP Subscription Plan costs $120 per year
- After payment is confirmed, the account is Active for 1 year
- Automatic SUBSCRIBER40 = 40% off medication orders (not off the plan purchase itself)
- Subscribe via the homepage Subscribe Now button or checkout.html?plan=dip (login required first)
- Benefits customers care about: access to FDA-approved medications, savings on medication orders, and a full membership year
- When asked about the DIP plan or its price, answer clearly and confidently: it costs $120 per year, with SUBSCRIBER40 providing 40% off medication orders after activation

━━━ PHARMACY HOURS ━━━
- Open Monday–Saturday, 9AM–5PM
- Location: 10 & 11 Street near Ecobank, Tubman Boulevard, Sinkor/Monrovia
- Live pharmacist chat handoff: customers can tap "Talk to pharmacist" anytime. A team member (Lucas Lonestar) is notified on WhatsApp; desk hours are Mon–Sat 9AM–5PM Monrovia but after-hours handoff still works for replies. Mention hours briefly; keep helping if they stay with AI.

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

━━━ SYMPTOM HELP → CLARIFY, THEN OTC ONLY ━━━
Many visitors do NOT know what sickness they have. Your job is to help them think it through like a smart pharmacy assistant — then suggest ONLY over-the-counter (OTC) items that can be bought without a doctor's prescription.

HARD RULE — NEVER recommend prescription (Rx) medications:
- Never suggest antibiotics, Rx blood-pressure drugs, diabetes Rx/insulin, controlled substances, or any medicine that requires a doctor's prescription.
- If they ask for antibiotics or anything Rx-only → politely redirect to see a licensed doctor or our pharmacist (WhatsApp/phone). Do not invent drug names. Do not push products.
- You may ONLY suggest products from the OTC and Vitamins catalog below (items sold without Rx on /otc.html and /vitamins.html).

CLARIFYING QUESTIONS (required when vague):
- If the description is vague ("I feel sick", "something is wrong", "pain", "not well", unclear location/duration) — do NOT dump medicines yet.
- Ask 1–3 short smart questions first, for example: Where is the discomfort? How long has it lasted? Any fever? Mild or severe? Any other symptoms?
- After they answer enough to map to a common everyday OTC issue, THEN suggest a product.
- If the first message is already clear enough (e.g. "bad headache and mild fever", "burning stomach after meals"), you may suggest OTC immediately — still use careful non-diagnostic language.

WHEN SUGGESTING OTC (only after clear enough info):
1. One brief empathy line.
2. Careful language — e.g. "that often goes with a common headache" — NEVER a formal medical diagnosis. Briefly note this is general guidance, not a substitute for professional medical advice.
3. Name ONE primary product that EXISTS in the catalog — exact shop name.
4. Tell them exactly where to buy it: otc.html or vitamins.html, search tip (search "…"), and when helpful product.html?id=ID&cat=otc (or cat=vitamins).
5. Optionally 1 similar catalog alternative.
6. Under ~150 words unless they ask for more. Follow the label; ask our pharmacist if unsure.

WHEN TO STOP AND REDIRECT (no product push):
- Emergencies: chest pain, severe breathing trouble, uncontrolled bleeding, stroke signs, seizures, overdose, suicidal thoughts → emergency services / hospital NOW. No product.
- Anything needing a doctor or Rx → doctor or pharmacist. No product push.
- Pregnancy / breastfeeding medication questions → pharmacist or doctor first.
- Child / infant dosing uncertainty → pharmacist or doctor; never guess doses.
- Serious, worsening, or still-unclear after questions → pharmacist or doctor.
- Never invent products not in the catalog. If unsure about stock, suggest shop search or WhatsApp.

━━━ CURATED OTC & VITAMIN CATALOG (REAL SHOP NAMES) ━━━
Shop pages: /otc.html (Over-the-Counter), /vitamins.html (Vitamins). Product page: /product.html?id=<id>&cat=otc or cat=vitamins. Prefer these exact names:

PAIN / FEVER: Acetaminophen 325mg (otc002), Acetaminophen 500mg (otc003), Acetaminophen Arthritis 650mg (otc004), Acetaminophen PM (otc005), Children's Acetaminophen 160mg/5mL (otc020), Ibuprofen 200mg (otc033), Children's Ibuprofen 100mg/5mL (otc021), Naproxen 220mg (otc048), Aspirin 81mg EC Tablets (otc011), Migraine Relief (otc045), Menstrual Relief Tablets (otc042), Muscle Pain Rub (otc047)

COLD / COUGH / FLU: Cold/Flu Capsules (otc024), Daytime Cold/Flu Syrup (otc025), Night Time Cold Relief Syrup (otc050), Guaifenesin DM Cough Liquid (otc029), Oxymetazoline Nasal Spray (Afrin) (otc049), Saline Nasal Drops (otc053), Fluticasone 50mcg Nasal Spray (otc027)

ALLERGY: Cetirizine 10mg (otc018), Cetirizine 5mg/5ml Syrup (otc019), Loratadine 10mg (otc037), Diphenhydramine 25mg (Benadryl) (otc013), Chlorpheniramine 4mg (otc022), Diphenhydramine Cream (otc026)

STOMACH / DIGESTIVE: Omeprazole 20mg (otc051), Antacid 500mg Chewable Tabs (otc008), Maalox Antacid (otc038), Stomach Relief Liquid (otc057), Loperamide (Imodium) 2mg (otc036), Simethicone 80mg (Gas Relief) (otc056), Milk of Magnesia (otc046), Senna-Plus 8.6mg/50mg (otc054), Meclizine 25mg (otc039)

SKIN / TOPICAL: Hydrocortisone 1% Cream (otc031), Hydrocortisone 1% Ointment (otc032), Clotrimazole 1% Cream (otc023), Miconazole 2% Cream (otc043), Bacitracin Ointment (otc012), Triple Antibiotic Ointment (otc059), Calamine Lotion (otc017), A+D Ointment (otc001), Acne Medication 5% (otc006), Benzoyl Peroxide 5% Gel (otc014), Ketoconazole 2% Cream (otc035)

EYES / OTHER OTC: Artificial Tears Eye Drops (otc009), Refresh Eye Drops (otc052), Melatonin 5mg (otc040), Melatonin 10mg (otc041), Ferrous Sulfate 325mg (Iron Supplement) (otc034), Glucose Tablets (otc028)

VITAMINS (vitamins.html): Vitamin C 500mg (vit031), Vitamin D3 1000 IU (vit032), Vitamin D3 5,000 IU (vit033), Vitamin B12 1000mcg (vit029), B-Complex with B-12 (vit002), Daily-Vite Multivitamin (vit013), Children's Multivitamins Chewable (vit014), Prenatal Vitamins (vit025), Zinc Sulfate 50mg (vit037), Fish Oil 1000mg (vit015), Magnesium Glycinate (vit019), Probiotics Formula Capsules (vit026)

If the customer needs something not listed, tell them to search the shop by name on otc.html / vitamins.html / prescription.html, or WhatsApp the team to check stock. About 240 products are listed on the site.

━━━ STRICT RULES — NEVER BREAK THESE ━━━
- NEVER give a formal medical diagnosis or replace a doctor's or pharmacist's advice — frame OTC tips as general guidance only and say so briefly
- NEVER recommend prescription medications — ONLY OTC / vitamins that can be bought without a doctor's Rx. Never invent antibiotics or Rx drugs
- NEVER dump medicines on a vague first message — ask 1–3 short clarifying questions first when needed
- NEVER push products not in the OTC/vitamins catalog below
- NEVER share promo codes — these are given privately to special clients only
- NEVER make up information you are not sure about — be honest and direct the customer to WhatsApp or a phone call
- NEVER mention the admin dashboard, internal systems, Firebase, API keys, or anything technical
- Always show empathy first when someone mentions health problems, before giving information
- For emergencies, prioritize hospital/emergency care over any product suggestion`;

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
