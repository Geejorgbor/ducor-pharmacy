/**
 * Admin AI tool definitions + server-side executors.
 * Maps former dashboard [DO:] / aiExec_* actions to Firestore (and GH publish).
 */
import {
  getAdminState,
  setAdminState,
  findOrder,
  listRecentOrders,
  patchDocument,
  listLiveChatSessions,
  getSession,
  claimLiveChatSession,
  returnLiveChatToAI,
  writeWhatsAppStaffReply,
  closeLiveChatSession,
  findCustomersByEmail,
  findSessionByCode,
} from './firestore-bridge.js';

const VALID_CATS = ['prescription', 'otc', 'vitamins'];
const VALID_STATUSES = ['new', 'processing', 'ready', 'delivered', 'cancelled', 'canceled'];
const BUILTIN_PROMOS = ['SUBSCRIBER40', 'HOLIDAY15'];
const SITE = process.env.PUBLIC_SITE_URL || 'https://www.ducor-international-pharmacy.com';
const GH_REPO = 'Geejorgbor/ducor-pharmacy';

export const ADMIN_SYSTEM = `You are the Ducor International Pharmacy admin operations AI for Lucas Paye (operator: lucaspaye02@gmail.com).
You have REAL server-side tools that change the live website / Firestore. Use tools to perform actions — do NOT invent [DO:] tags.
When Lucas asks you to do something operational (orders, products, promos, live chat, publish, remember, announce), call the appropriate tool(s), then summarize results clearly.
Be concise, warm, and precise. Confirm what changed. If a tool fails, say so and suggest the next step.
Never expose secrets, API keys, tokens, or service-account JSON.
Order statuses: new → processing → ready → delivered (also cancelled).
Categories: prescription, otc, vitamins.
Live chat: claim / reply / return_to_ai / close work without the dashboard tab open.
Publish pushes product catalog + promo codes to GitHub so Vercel rebuilds the public site (~60s).
Do not use tools for idle conversation — only when an action is needed.`;

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'list_orders',
      description: 'List recent pharmacy orders (newest first).',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max orders (default 15, max 40)' },
          status: { type: 'string', description: 'Optional status filter' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order',
      description: 'Get one order by Firestore id, trailing id, or ref (e.g. DUCOR-43938421).',
      parameters: {
        type: 'object',
        properties: { id_or_ref: { type: 'string' } },
        required: ['id_or_ref'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_order_status',
      description: 'Update order status (new|processing|ready|delivered|cancelled). Sends WhatsApp/email side-effects when status becomes ready.',
      parameters: {
        type: 'object',
        properties: {
          id_or_ref: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['id_or_ref', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirm_payment',
      description: 'Mark order paymentConfirmed=true; activates DIP subscription on the order/customer when applicable.',
      parameters: {
        type: 'object',
        properties: { id_or_ref: { type: 'string' } },
        required: ['id_or_ref'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_order_note',
      description: 'Set adminNote on an order.',
      parameters: {
        type: 'object',
        properties: {
          id_or_ref: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['id_or_ref', 'note'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_products',
      description: 'List products from shared admin_state (optionally filter by category or search name).',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'prescription|otc|vitamins' },
          search: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_product',
      description: 'Update product price and/or name in admin_state products.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
          price: { type: 'number' },
          name: { type: 'string' },
        },
        required: ['id', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_product',
      description: 'Add a product to a category in admin_state.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
        },
        required: ['category', 'name', 'price'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_product',
      description: 'Delete a product from admin_state by id + category.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
        },
        required: ['id', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_stock',
      description: 'Mark product in/out of stock (outOfStock flag).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
          in_stock: { type: 'boolean' },
        },
        required: ['id', 'category', 'in_stock'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_photo',
      description: 'Set custom product photo URL (stored in admin_state/photos).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['id', 'category', 'url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_photo',
      description: 'Remove custom product photo from admin_state/photos.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
        },
        required: ['id', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'promo_set',
      description: 'Add/update a promo code in admin_state (type percent|flat).',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          type: { type: 'string' },
          value: { type: 'number' },
        },
        required: ['code', 'type', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'promo_remove',
      description: 'Remove a promo code (tombstone for built-ins).',
      parameters: {
        type: 'object',
        properties: { code: { type: 'string' } },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'announce',
      description: 'Post an admin notification announcement.',
      parameters: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remember',
      description: 'Append a short note to boss_memory (relationship memory about Lucas).',
      parameters: {
        type: 'object',
        properties: { note: { type: 'string' } },
        required: ['note'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'append_security_log',
      description: 'Append an entry to the admin security/activity log.',
      parameters: {
        type: 'object',
        properties: {
          level: { type: 'string', description: 'info|success|warning|error' },
          message: { type: 'string' },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_live_chats',
      description: 'List recent live chat sessions (waiting/human/ai).',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'live_chat_claim',
      description: 'Claim a live chat session as pharmacist (status=human).',
      parameters: {
        type: 'object',
        properties: {
          session_id: { type: 'string', description: 'Full UUID or 8-char session code' },
        },
        required: ['session_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'live_chat_reply',
      description: 'Send a staff reply into a live chat (auto-claims if waiting).',
      parameters: {
        type: 'object',
        properties: {
          session_id: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['session_id', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'live_chat_return_to_ai',
      description: 'Return a live chat session to the AI assistant.',
      parameters: {
        type: 'object',
        properties: { session_id: { type: 'string' } },
        required: ['session_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'live_chat_close',
      description: 'Close a live chat session.',
      parameters: {
        type: 'object',
        properties: { session_id: { type: 'string' } },
        required: ['session_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_customers',
      description: 'Look up customers by email (admin read).',
      parameters: {
        type: 'object',
        properties: { email: { type: 'string' } },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'publish_site',
      description: 'Publish admin_state products + promos to GitHub (shop.js + checkout.html) using server GH_STATE_TOKEN. Triggers Vercel rebuild.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

function ok(summary, extra = {}) {
  return { ok: true, summary, ...extra };
}
function fail(error, extra = {}) {
  return { ok: false, error: String(error), summary: '⚠ ' + error, ...extra };
}

function orderSummary(o) {
  if (!o) return null;
  const id = o.__id || o.id;
  const name =
    o.buyerName ||
    [o.firstName, o.lastName].filter(Boolean).join(' ') ||
    o.customerName ||
    '—';
  return {
    id,
    ref: o.ref || (id ? String(id).slice(-8).toUpperCase() : ''),
    status: o.status || 'new',
    customer: name,
    email: o.email || o.buyerEmail || '',
    phone: o.phone || o.buyerPhone || '',
    total: o.total,
    paymentConfirmed: !!o.paymentConfirmed,
    isSubscription: !!o.isSubscription,
    adminNote: o.adminNote || '',
    createdAt: o.createdAt || o.time || null,
  };
}

async function loadProducts() {
  const value = await getAdminState('products');
  if (value && typeof value === 'object') return value;
  return { prescription: [], otc: [], vitamins: [] };
}

async function saveProducts(products) {
  await setAdminState('products', products);
}

async function resolveSessionId(sessionIdOrCode) {
  const raw = String(sessionIdOrCode || '').trim();
  if (!raw) return null;
  if (raw.includes('-') && raw.length > 20) return raw;
  // Try as full id first
  try {
    const s = await getSession(raw);
    if (s) return s.__id || raw;
  } catch (_) {}
  const byCode = await findSessionByCode(raw);
  if (byCode) return byCode.__id;
  // Prefix match on listed sessions
  const list = await listLiveChatSessions(50);
  const upper = raw.toUpperCase().replace(/-/g, '');
  const hit = list.find((s) => {
    const id = String(s.__id || '').replace(/-/g, '').toUpperCase();
    return id.startsWith(upper) || String(s.sessionCode || '').toUpperCase() === upper;
  });
  return hit ? hit.__id : null;
}

async function notifyWhatsApp(payload) {
  try {
    await fetch(`${SITE}/api/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_) {}
}

async function notifyEmail(payload) {
  try {
    await fetch(`${SITE}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_) {}
}

async function appendNotif(type, title, message) {
  let notifs = [];
  try {
    notifs = (await getAdminState('notifications')) || [];
  } catch (_) {}
  if (!Array.isArray(notifs)) notifs = [];
  notifs.unshift({
    id: 'ai-' + Date.now(),
    type: type || 'info',
    title,
    message,
    time: 'Just now',
    ts: new Date().toISOString(),
    read: false,
  });
  await setAdminState('notifications', notifs.slice(0, 100));
}

async function appendLog(level, message) {
  let log = [];
  try {
    log = (await getAdminState('security_log')) || [];
  } catch (_) {}
  if (!Array.isArray(log)) log = [];
  log.unshift({
    id: 'ai-' + Date.now(),
    level: level || 'info',
    message,
    time: new Date().toISOString(),
  });
  await setAdminState('security_log', log.slice(0, 200));
}

export async function executeTool(name, args = {}, ctx = {}) {
  try {
    switch (name) {
      case 'list_orders':
        return await toolListOrders(args);
      case 'get_order':
        return await toolGetOrder(args);
      case 'update_order_status':
        return await toolUpdateOrderStatus(args);
      case 'confirm_payment':
        return await toolConfirmPayment(args);
      case 'add_order_note':
        return await toolAddOrderNote(args);
      case 'list_products':
        return await toolListProducts(args);
      case 'update_product':
        return await toolUpdateProduct(args);
      case 'add_product':
        return await toolAddProduct(args);
      case 'delete_product':
        return await toolDeleteProduct(args);
      case 'set_stock':
        return await toolSetStock(args);
      case 'set_photo':
        return await toolSetPhoto(args);
      case 'remove_photo':
        return await toolRemovePhoto(args);
      case 'promo_set':
        return await toolPromoSet(args);
      case 'promo_remove':
        return await toolPromoRemove(args);
      case 'announce':
        return await toolAnnounce(args);
      case 'remember':
        return await toolRemember(args);
      case 'append_security_log':
        return await toolAppendSecurityLog(args);
      case 'list_live_chats':
        return await toolListLiveChats(args);
      case 'live_chat_claim':
        return await toolLiveChatClaim(args);
      case 'live_chat_reply':
        return await toolLiveChatReply(args);
      case 'live_chat_return_to_ai':
        return await toolLiveChatReturn(args);
      case 'live_chat_close':
        return await toolLiveChatClose(args);
      case 'list_customers':
        return await toolListCustomers(args);
      case 'publish_site':
        return await toolPublishSite(args, ctx);
      default:
        return fail('Unknown tool: ' + name);
    }
  } catch (e) {
    console.error('Tool error', name, e.message);
    return fail(e.message || String(e));
  }
}

async function toolListOrders(args) {
  const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 40);
  let orders = await listRecentOrders(limit * 2);
  if (args.status) {
    const st = String(args.status).toLowerCase();
    orders = orders.filter((o) => String(o.status || '').toLowerCase() === st);
  }
  orders = orders.slice(0, limit);
  const rows = orders.map(orderSummary);
  return ok(`Found ${rows.length} order(s)`, { orders: rows });
}

async function toolGetOrder(args) {
  const order = await findOrder(args.id_or_ref);
  if (!order) return fail('Order not found: ' + args.id_or_ref);
  return ok('Order loaded', { order: orderSummary(order), raw_items: (order.items || []).slice(0, 30) });
}

async function toolUpdateOrderStatus(args) {
  const status = String(args.status || '').toLowerCase().trim();
  if (!VALID_STATUSES.includes(status)) {
    return fail('Invalid status. Use: ' + VALID_STATUSES.join(', '));
  }
  const normalized = status === 'canceled' ? 'cancelled' : status;
  const order = await findOrder(args.id_or_ref);
  if (!order) return fail('Order not found: ' + args.id_or_ref);
  const id = order.__id;
  const prev = order.status || 'new';
  await patchDocument(`orders/${id}`, {
    status: normalized,
    statusUpdatedAt: new Date().toISOString(),
  });

  const customerName =
    order.buyerName ||
    [order.firstName, order.lastName].filter(Boolean).join(' ') ||
    '—';

  await notifyWhatsApp({
    type: 'status_update',
    delivery: {
      ref: order.ref,
      orderId: id,
      customerName,
      customerPhone: order.phone || order.buyerPhone || '—',
      prevStatus: prev,
      newStatus: normalized,
    },
  });

  if (normalized === 'ready' && order.confirmToken) {
    const confirmUrl = `${SITE}/confirm-delivery.html?order=${encodeURIComponent(id)}&token=${encodeURIComponent(order.confirmToken)}`;
    const ref = order.ref || String(id).slice(-8).toUpperCase();
    const payload = {
      customerPhone: order.phone || order.buyerPhone || '',
      collectorPhone: order.pickupPhone || '',
      customerName,
      collectorName: order.pickupName || '',
      ref,
      confirmUrl,
      items: (order.items || []).map((i) => `${i.name} ×${i.qty}`).join(', '),
      total: order.total || 0,
      rxPricesPending: order.rxPricesPending || false,
    };
    await notifyWhatsApp({ type: 'customer_ready', customerOrder: payload });
    const buyerEmail = order.email || order.buyerEmail || '';
    if (buyerEmail) {
      await notifyEmail({
        type: 'order_ready',
        data: {
          buyerEmail,
          buyerName: customerName,
          ref,
          confirmUrl,
          collectorName: order.pickupName || '',
          collectorPhone: order.pickupPhone || '',
          items: order.items || [],
          total: order.total || 0,
          rxPricesPending: order.rxPricesPending || false,
        },
      });
    }
  }

  await appendLog('info', `AI updated order #${String(id).slice(-8)}: ${prev} → ${normalized}`);
  await appendNotif('info', 'AI: Order Updated', `#${String(id).slice(-8)}: ${prev} → ${normalized}`);
  return ok(`Order #${String(id).slice(-8)}: ${prev} → ${normalized}`, {
    id,
    prev,
    status: normalized,
  });
}

async function toolConfirmPayment(args) {
  const order = await findOrder(args.id_or_ref);
  if (!order) return fail('Order not found: ' + args.id_or_ref);
  const id = order.__id;
  const paymentConfirmedAt = new Date().toISOString();
  const patch = { paymentConfirmed: true, paymentConfirmedAt };
  if (order.isSubscription) {
    patch.subscriptionStatus = 'active';
    patch.subscriptionActivatedAt = paymentConfirmedAt;
  }
  await patchDocument(`orders/${id}`, patch);

  if (order.isSubscription && (order.buyerEmail || order.email)) {
    const email = String(order.buyerEmail || order.email).toLowerCase();
    const customers = await findCustomersByEmail(email);
    if (customers.length) {
      const start = new Date();
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      await patchDocument(`customers/${customers[0].__id}`, {
        subscriber: true,
        subscriptionStatus: 'active',
        subscriptionPlan: order.subscriptionPlan || 'dip',
        planStart: start.toISOString(),
        planEnd: end.toISOString(),
        planActivatedAt: start.toISOString(),
      });
    }
  }

  await appendLog('success', `AI confirmed payment on #${String(id).slice(-8)}`);
  await appendNotif('success', 'AI: Payment Confirmed', `Order #${String(id).slice(-8)} payment marked as received`);
  return ok(`Payment confirmed on order #${String(id).slice(-8)}`, { id, paymentConfirmed: true });
}

async function toolAddOrderNote(args) {
  const order = await findOrder(args.id_or_ref);
  if (!order) return fail('Order not found: ' + args.id_or_ref);
  const note = String(args.note || '').slice(0, 2000);
  const id = order.__id;
  await patchDocument(`orders/${id}`, { adminNote: note });
  await appendLog('info', `AI note on #${String(id).slice(-8)}: ${note}`);
  return ok(`Note saved on #${String(id).slice(-8)}: "${note}"`, { id, note });
}

async function toolListProducts(args) {
  const products = await loadProducts();
  const cat = args.category ? String(args.category).toLowerCase() : null;
  const search = args.search ? String(args.search).toLowerCase() : '';
  const limit = Math.min(Math.max(Number(args.limit) || 40, 1), 100);
  const cats = cat && VALID_CATS.includes(cat) ? [cat] : VALID_CATS;
  const out = [];
  for (const c of cats) {
    for (const p of products[c] || []) {
      if (search && !String(p.name || '').toLowerCase().includes(search) && !String(p.id || '').toLowerCase().includes(search)) {
        continue;
      }
      out.push({
        id: p.id,
        name: p.name,
        price: p.price,
        category: c,
        outOfStock: !!p.outOfStock,
      });
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  return ok(`${out.length} product(s)`, { products: out });
}

async function toolUpdateProduct(args) {
  const cat = String(args.category || '').toLowerCase();
  if (!VALID_CATS.includes(cat)) return fail('Invalid category');
  const products = await loadProducts();
  const list = products[cat] || [];
  const idx = list.findIndex((p) => p.id === args.id);
  if (idx < 0) return fail(`Product not found: ${args.id} in ${cat}`);
  const prev = { ...list[idx] };
  if (args.price != null && !Number.isNaN(Number(args.price))) list[idx].price = Number(args.price);
  if (args.name) list[idx].name = String(args.name).slice(0, 200);
  products[cat] = list;
  await saveProducts(products);
  await appendLog('info', `AI updated product ${list[idx].name} [${args.id}]`);
  return ok(`Updated ${list[idx].name}`, { before: prev, after: list[idx] });
}

async function toolAddProduct(args) {
  const cat = String(args.category || '').toLowerCase();
  if (!VALID_CATS.includes(cat)) return fail('Invalid category');
  const name = String(args.name || '').trim().slice(0, 200);
  const price = Number(args.price);
  if (!name || Number.isNaN(price)) return fail('name and numeric price required');
  const products = await loadProducts();
  const prefix = { prescription: 'rx', otc: 'otc', vitamins: 'vit' }[cat];
  const newId = prefix + 'ai' + Date.now();
  const entry = { id: newId, name, price };
  products[cat] = products[cat] || [];
  products[cat].push(entry);
  await saveProducts(products);
  await appendLog('info', `AI added: "${name}" ($${price.toFixed(2)}) to ${cat} [${newId}]`);
  await appendNotif('success', 'AI: Product Added', `"${name}" added to ${cat} at $${price.toFixed(2)}`);
  return ok(`Added "${name}" to ${cat} at $${price.toFixed(2)} (ID: ${newId})`, { product: entry, category: cat });
}

async function toolDeleteProduct(args) {
  const cat = String(args.category || '').toLowerCase();
  if (!VALID_CATS.includes(cat)) return fail('Invalid category');
  const products = await loadProducts();
  const list = products[cat] || [];
  const p = list.find((x) => x.id === args.id);
  if (!p) return fail(`Product not found: ${args.id}`);
  products[cat] = list.filter((x) => x.id !== args.id);
  await saveProducts(products);
  await appendLog('warning', `AI deleted: "${p.name}" [${args.id}] from ${cat}`);
  return ok(`Deleted "${p.name}" from ${cat}`, { id: args.id, category: cat });
}

async function toolSetStock(args) {
  const cat = String(args.category || '').toLowerCase();
  if (!VALID_CATS.includes(cat)) return fail('Invalid category');
  const products = await loadProducts();
  const list = products[cat] || [];
  const idx = list.findIndex((p) => p.id === args.id);
  if (idx < 0) return fail(`Product not found: ${args.id}`);
  const inStock = !!args.in_stock;
  list[idx].outOfStock = !inStock;
  products[cat] = list;
  await saveProducts(products);
  const label = inStock ? 'In Stock' : 'Out of Stock';
  await appendLog('info', `AI stock: ${list[idx].name} → ${label}`);
  return ok(`${list[idx].name} marked ${label}`, { id: args.id, in_stock: inStock });
}

async function toolSetPhoto(args) {
  const cat = String(args.category || '').toLowerCase();
  const products = await loadProducts();
  const p = (products[cat] || []).find((x) => x.id === args.id);
  if (!p) return fail(`Product not found: ${args.id} in ${cat}`);
  let photos = {};
  try {
    photos = (await getAdminState('photos')) || {};
  } catch (_) {}
  if (typeof photos !== 'object' || Array.isArray(photos)) photos = {};
  photos[args.id] = String(args.url).slice(0, 2000);
  await setAdminState('photos', photos);
  await appendLog('info', `AI set photo for ${p.name} (${args.id})`);
  return ok(`Photo set for ${p.name} (admin_state/photos). Publish separately if needed for public CDN assets.`, {
    id: args.id,
    url: photos[args.id],
  });
}

async function toolRemovePhoto(args) {
  const cat = String(args.category || '').toLowerCase();
  const products = await loadProducts();
  const p = (products[cat] || []).find((x) => x.id === args.id);
  if (!p) return fail(`Product not found: ${args.id}`);
  let photos = {};
  try {
    photos = (await getAdminState('photos')) || {};
  } catch (_) {}
  if (!photos || !photos[args.id]) return fail(`No custom photo for ${p.name}`);
  delete photos[args.id];
  await setAdminState('photos', photos);
  return ok(`Custom photo removed for ${p.name}`, { id: args.id });
}

async function toolPromoSet(args) {
  const code = String(args.code || '').toUpperCase().trim();
  const type = String(args.type || '').toLowerCase();
  const value = Number(args.value);
  if (!code || !['percent', 'flat'].includes(type) || Number.isNaN(value)) {
    return fail('code, type (percent|flat), and numeric value required');
  }
  let promos = {};
  try {
    promos = (await getAdminState('promos')) || {};
  } catch (_) {}
  if (typeof promos !== 'object') promos = {};
  promos[code] = { type, value };
  await setAdminState('promos', promos);
  const display = type === 'percent' ? `${value}% off` : `$${value} off`;
  await appendLog('info', `AI promo set: ${code} = ${display}`);
  return ok(`Promo ${code} set to ${display}. Call publish_site to apply at checkout.`, { code, type, value });
}

async function toolPromoRemove(args) {
  const code = String(args.code || '').toUpperCase().trim();
  let promos = {};
  try {
    promos = (await getAdminState('promos')) || {};
  } catch (_) {}
  if (typeof promos !== 'object') promos = {};
  if (!promos[code] && !BUILTIN_PROMOS.includes(code)) return fail('Promo not found: ' + code);
  promos[code] = { _removed: true };
  await setAdminState('promos', promos);
  await appendLog('warning', `AI removed promo: ${code}`);
  return ok(`Promo ${code} removed. Call publish_site to apply at checkout.`, { code });
}

async function toolAnnounce(args) {
  const message = String(args.message || '').trim().slice(0, 1000);
  if (!message) return fail('message required');
  await appendNotif('info', 'AI Announcement', message);
  await appendLog('info', `AI announcement: ${message}`);
  return ok(`Announcement posted: "${message}"`);
}

async function toolRemember(args) {
  const note = String(args.note || '').trim().slice(0, 500);
  if (!note) return fail('note required');
  let memory = [];
  try {
    memory = (await getAdminState('boss_memory')) || [];
  } catch (_) {}
  if (!Array.isArray(memory)) memory = [];
  memory.push({ note, date: new Date().toISOString() });
  if (memory.length > 60) memory = memory.slice(-60);
  await setAdminState('boss_memory', memory);
  await appendLog('info', `AI remembered: ${note}`);
  return ok(`Noted — remembered: "${note}"`, { count: memory.length });
}

async function toolAppendSecurityLog(args) {
  const message = String(args.message || '').trim().slice(0, 1000);
  if (!message) return fail('message required');
  const level = String(args.level || 'info');
  await appendLog(level, message);
  return ok(`Logged (${level}): ${message}`);
}

async function toolListLiveChats(args) {
  const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
  const sessions = await listLiveChatSessions(limit);
  const rows = sessions.map((s) => ({
    id: s.__id,
    code: s.sessionCode || String(s.__id || '').replace(/-/g, '').slice(0, 8).toUpperCase(),
    status: s.status,
    clientName: s.clientName || '',
    preview: s.lastMessage || s.preview || '',
    claimedBy: s.claimedBy || null,
    updatedAt: s.updatedAt || s.lastMessageAt || null,
  }));
  return ok(`${rows.length} session(s)`, { sessions: rows });
}

async function toolLiveChatClaim(args) {
  const sid = await resolveSessionId(args.session_id);
  if (!sid) return fail('Live chat session not found: ' + args.session_id);
  const result = await claimLiveChatSession(sid, 'Pharmacist');
  await appendLog('info', `AI claimed live chat ${String(sid).slice(0, 8)}`);
  return ok(`Claimed chat ${String(sid).slice(0, 8)}`, result);
}

async function toolLiveChatReply(args) {
  const sid = await resolveSessionId(args.session_id);
  if (!sid) return fail('Live chat session not found: ' + args.session_id);
  const message = String(args.message || '').trim().slice(0, 4000);
  if (!message) return fail('message required');
  const result = await writeWhatsAppStaffReply(sid, message, {
    claimedBy: 'Pharmacist',
    senderName: 'Pharmacist',
  });
  await appendLog('info', `AI replied on live chat ${String(sid).slice(0, 8)}`);
  return ok(`Replied on chat ${String(sid).slice(0, 8)}`, result);
}

async function toolLiveChatReturn(args) {
  const sid = await resolveSessionId(args.session_id);
  if (!sid) return fail('Live chat session not found: ' + args.session_id);
  const result = await returnLiveChatToAI(sid);
  await appendLog('info', `AI returned chat ${String(sid).slice(0, 8)} to AI`);
  return ok(`Returned chat ${String(sid).slice(0, 8)} to AI`, result);
}

async function toolLiveChatClose(args) {
  const sid = await resolveSessionId(args.session_id);
  if (!sid) return fail('Live chat session not found: ' + args.session_id);
  const result = await closeLiveChatSession(sid);
  await appendLog('info', `AI closed chat ${String(sid).slice(0, 8)}`);
  return ok(`Closed chat ${String(sid).slice(0, 8)}`, result);
}

async function toolListCustomers(args) {
  const email = String(args.email || '').trim().toLowerCase();
  if (!email) return fail('email required');
  const customers = await findCustomersByEmail(email);
  const rows = customers.map((c) => ({
    id: c.__id,
    email: c.email,
    name: c.name || c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' '),
    subscriber: !!c.subscriber,
    subscriptionStatus: c.subscriptionStatus || null,
    planEnd: c.planEnd || null,
    phone: c.phone || null,
  }));
  return ok(`${rows.length} customer(s)`, { customers: rows });
}

function buildProductsJSBlock(products) {
  const cats = ['prescription', 'otc', 'vitamins'];
  let str = 'const PRODUCTS = {\n';
  cats.forEach((cat, ci) => {
    str += `  ${cat}: [\n`;
    const arr = products[cat] || [];
    arr.forEach((p, i) => {
      const comma = i < arr.length - 1 ? ',' : '';
      const safeName = String(p.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const price = Number(p.price);
      const priceStr = Number.isFinite(price) ? price.toFixed(2) : '0.00';
      str += `    {id:'${p.id}',name:'${safeName}',price:${priceStr}}${comma}\n`;
    });
    str += `  ]${ci < cats.length - 1 ? ',' : ''}\n`;
  });
  str += '};';
  return str;
}

async function ghGetFile(path, token) {
  const resp = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`GitHub GET ${path}: ${data.message || resp.status}`);
  const content = Buffer.from(String(data.content || '').replace(/\n/g, ''), 'base64').toString('utf8');
  return { sha: data.sha, content };
}

async function ghPutFile(path, token, content, sha, message) {
  const resp = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`GitHub PUT ${path}: ${data.message || resp.status}`);
  return data;
}

async function toolPublishSite(_args, _ctx) {
  const token = process.env.GH_STATE_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (!token) {
    return fail(
      'GH_STATE_TOKEN not configured on server. Set it in Vercel env, or publish from dashboard with a local GitHub token.'
    );
  }

  const products = await loadProducts();
  const newProds = buildProductsJSBlock(products);
  const shop = await ghGetFile('assets/shop.js', token);
  const updatedShop = shop.content.replace(
    /\/\/ ── PRODUCT DATA ──[^\n]*\n\nconst PRODUCTS = \{[\s\S]*?\n\};\n/,
    `// ── PRODUCT DATA ──────────────────────────────────────────────────────────────\n\n${newProds}\n`
  );
  if (updatedShop === shop.content) {
    return fail('Could not find PRODUCTS section in shop.js to replace');
  }
  await ghPutFile('assets/shop.js', token, updatedShop, shop.sha, 'AI: Update product catalog via Admin AI (server)');

  let promoMsg = '';
  try {
    let dynamic = {};
    try {
      dynamic = (await getAdminState('promos')) || {};
    } catch (_) {}
    const builtIn = {
      SUBSCRIBER40: { type: 'percent', value: 40, label: '40% off for Subscription Plan clients' },
      HOLIDAY15: { type: 'percent', value: 15, label: '15% off for the holiday season' },
    };
    const merged = { ...builtIn };
    Object.entries(dynamic || {}).forEach(([code, v]) => {
      if (!v || v._removed) {
        delete merged[code];
        return;
      }
      const label = v.type === 'percent' ? `${v.value}% off` : `$${v.value} off`;
      merged[code] = { type: v.type, value: v.value, label };
    });
    const lines = Object.entries(merged)
      .map(
        ([code, v]) =>
          `    '${code}': { type:'${v.type}', value:${v.value}, label:'${String(v.label).replace(/'/g, "\\'")}' },`
      )
      .join('\n');
    const newBlock = `const PROMO_CODES = {\n${lines}\n  };`;
    const checkout = await ghGetFile('checkout.html', token);
    const updatedCheckout = checkout.content.replace(/const PROMO_CODES = \{[\s\S]*?\n  \};/, newBlock);
    if (updatedCheckout !== checkout.content) {
      await ghPutFile(
        'checkout.html',
        token,
        updatedCheckout,
        checkout.sha,
        'AI: Update promo codes via Admin AI (server)'
      );
      promoMsg = ' Promo codes updated too.';
    }
  } catch (e) {
    promoMsg = ` (promo publish skipped: ${e.message})`;
  }

  await appendLog('success', 'AI published products to GitHub (server)');
  await appendNotif('success', 'AI: Website Updated', 'Product & promo changes pushed — site rebuilding (~60 sec).');
  return ok(`Published to website! Vercel rebuilding — live in ~60 seconds.${promoMsg}`);
}
