// Ducor International Pharmacy — name + symptom / condition search
// Used by the global search overlay and catalog page search bars.
(function (root) {
  'use strict';

  var NAME_ALIASES = {
    tylenol: 'acetaminophen',
    paracetamol: 'acetaminophen',
    advil: 'ibuprofen',
    motrin: 'ibuprofen',
    aleve: 'naproxen',
    prilosec: 'omeprazole',
    nexium: 'esomeprazole',
    claritin: 'loratadine',
    zyrtec: 'cetirizine',
    allegra: 'fexofenadine',
    benadryl: 'diphenhydramine',
    'ascorbic acid': 'vitamin c',
    ascorbic: 'vitamin c',
    tums: 'calcium carbonate',
    pepto: 'bismuth',
    afrin: 'oxymetazoline',
    'fish oil': 'omega',
    prenatals: 'prenatal',
    'vitamin c': 'vitamin c'
  };

  // Curated condition chips and synonym lists, including common Liberian / plain phrasing.
  var CONDITIONS = [
    {
      id: 'pain',
      label: 'Pain Relief',
      aliases: ['pain relief', 'pain', 'body pain', 'ache', 'aches', 'headache', 'migraine', 'sore', 'soreness', 'arthritis', 'muscle pain', 'backache', 'back pain', 'toothache', 'cramps', 'period pain', 'menstrual pain'],
      include: ['pain', 'migraine', 'headache', 'arthritis', 'ache', 'aches', 'analgesic', 'sore muscle', 'muscle pain', 'body pain', 'cramp', 'dysmenorrhea', 'gout'],
      exclude: []
    },
    {
      id: 'eye',
      label: 'Eye',
      aliases: ['eye', 'eyes', 'eye medication', 'eye medicine', 'eye drop', 'eye drops', 'eyedrop', 'watery eyes', 'itchy eyes', 'red eye', 'red eyes', 'dry eyes', 'dry eye'],
      include: ['eye', 'eyes', 'ophthalmic', 'ophthalmology', 'glaucoma', 'conjunctivitis', 'tears', 'eyelid', 'ocular', 'itchy eyes', 'watery eyes', 'dry eye'],
      exclude: []
    },
    {
      id: 'weight',
      label: 'Weight Loss',
      aliases: ['weight loss', 'lose weight', 'weight', 'slim', 'slimming', 'fat blocker', 'stomach grease', 'reduce grease', 'overweight', 'obesity', 'body weight'],
      include: ['weight loss', 'lose weight', 'body weight', 'appetite suppress', 'orlistat', 'fat absorption', 'obesity', 'overweight'],
      exclude: ['weight gain', 'stimulates appetite', 'stimulate appetite', 'promotes weight gain', 'promote weight gain']
    },
    {
      id: 'stomach',
      label: 'Stomach & Digestive',
      aliases: ['stomach', 'digestive', 'belly', 'belly running', 'running stomach', 'running belly', 'diarrhea', 'diarrhoea', 'constipation', 'gas', 'gas relief', 'heartburn', 'acid reflux', 'indigestion', 'nausea', 'vomit', 'vomiting', 'ulcer', 'loose stool', 'belly pain', 'stomach pain', 'constipation', 'antacid'],
      include: ['stomach', 'digestive', 'diarrhea', 'diarrhoea', 'constipation', 'heartburn', 'reflux', 'indigestion', 'nausea', 'vomiting', 'gas relief', 'antacid', 'laxative', 'ulcer', 'bowel', 'gastrointestinal', 'bloating', 'gas', 'heartburn', 'motion sickness', 'hemorrhoid', 'haemorrhoid', 'colitis'],
      exclude: []
    },
    {
      id: 'prostate',
      label: 'Prostate',
      aliases: ['prostate', 'bph', 'enlarged prostate', 'prostate cancer', 'weak urine', 'prostate health'],
      include: ['prostate', 'bph', 'prostatic', 'benign prostatic'],
      exclude: []
    },
    {
      id: 'coldflu',
      label: 'Cold & Flu',
      aliases: ['cold', 'flu', 'cold and flu', 'cold & flu', 'fever', 'cough', 'sniffle', 'blocked nose', 'runny nose', 'congestion', 'congested', 'sore throat', 'influenza', 'cold/flu'],
      include: ['cold/flu', 'cold and flu', 'influenza', 'cough', 'fever', 'nasal congestion', 'decongest', 'sore throat', 'common cold', 'flu capsule', 'flu syrup', 'cold relief', 'cold relief'],
      exclude: ['cold sore', 'cold sores']
    },
    {
      id: 'allergy',
      label: 'Allergy',
      aliases: ['allergy', 'allergies', 'hay fever', 'itchy', 'hives', 'sneeze', 'antihistamine', 'allergic', 'rhinitis'],
      include: ['allergy', 'allergies', 'allergic', 'antihistamine', 'hay fever', 'hives', 'rhinitis'],
      exclude: []
    },
    {
      id: 'skin',
      label: 'Skin',
      aliases: ['skin', 'rash', 'itch', 'acne', 'fungal', 'ringworm', 'eczema', 'wound', 'cream', 'ointment', 'dermatitis', 'athletes foot', "athlete's foot"],
      include: ['skin', 'topical', 'rash', 'acne', 'fungal', 'ringworm', 'eczema', 'dermatitis', 'wound', 'psoriasis', "athlete's foot", 'athletes foot', 'burn', 'cut', 'itch', 'ointment', 'cream for', 'herpes simplex skin', 'cold sores', 'cold sore'],
      exclude: []
    },
    {
      id: 'diabetes',
      label: 'Diabetes',
      aliases: ['diabetes', 'sugar', 'sugar disease', 'blood sugar', 'glucose', 'diabetic'],
      include: ['diabetes', 'blood sugar', 'glucose', 'metformin', 'insulin', 'hypoglycemia', 'hypoglycaemia', 'glimepiride', 'glipizide'],
      exclude: []
    },
    {
      id: 'heart',
      label: 'Blood Pressure & Heart',
      aliases: ['pressure', 'blood pressure', 'high pressure', 'hypertension', 'heart', 'chest pain', 'cholesterol', 'stroke', 'heart failure', 'angina'],
      include: ['blood pressure', 'hypertension', 'angina', 'heart failure', 'heart attack', 'cholesterol', 'triglycerides', 'statin', 'cardiovascular', 'stroke', 'heartbeat', 'arrhythmia', 'irregular heartbeat', 'blood thinner', 'clopidogrel'],
      exclude: ['eye pressure', 'high eye pressure']
    },
    {
      id: 'vitamins',
      label: 'Vitamins',
      aliases: ['vitamin', 'vitamins', 'supplement', 'supplements', 'multivitamin', 'multivitamins'],
      include: ['vitamin', 'supplement', 'multivitamin', 'mineral', 'omega', 'folic acid', 'iron supplement', 'coenzyme', 'coq10'],
      exclude: []
    },
    {
      id: 'womens',
      label: "Women's Health",
      aliases: ["women's health", 'womens health', 'woman', 'women', 'prenatal', 'pregnancy', 'pregnant', 'menstrual', 'period', 'yeast infection', 'vaginal'],
      include: ['prenatal', 'pregnancy', 'pregnant', 'menstrual', 'vaginal', 'yeast', "women's", 'womens', 'for women', 'letrozole'],
      exclude: []
    },
    {
      id: 'children',
      label: 'Children',
      aliases: ['children', 'child', 'kids', 'kid', 'pediatric', 'baby', 'infant', "children's"],
      include: ['children', 'pediatric', 'infant', 'child', "children's", 'kids'],
      exclude: []
    },
    {
      id: 'infection',
      label: 'Infection',
      aliases: ['infection', 'infections', 'antibiotic', 'antibiotics', 'bacteria', 'bacterial', 'uti', 'pneumonia', 'sinus', 'strep', 'fungal infection', 'virus', 'viral'],
      include: ['bacterial', 'antibiotic', 'infection', 'antifungal', 'antiviral', 'pneumonia', 'urinary tract', 'sinusitis', 'strep', 'herpes', 'fluconazole', 'nystatin', 'rifampin'],
      exclude: []
    },
    {
      id: 'sleep',
      label: 'Sleep',
      aliases: ['sleep', 'insomnia', 'cannot sleep', "can't sleep", 'cant sleep', 'sleepless', 'stay awake', 'melatonin', 'sleeping'],
      include: ['sleep', 'insomnia', 'melatonin', 'nighttime sleep', 'sleep problems'],
      exclude: []
    },
    {
      id: 'mental',
      label: 'Mental Health',
      aliases: ['mental health', 'depression', 'anxiety', 'mood', 'psychiatric', 'schizophrenia', 'bipolar', 'adhd'],
      include: ['depression', 'anxiety', 'schizophrenia', 'bipolar', 'antidepressant', 'antipsychotic', 'mood', 'psychiatric', 'adhd', 'attention deficit'],
      exclude: []
    }
  ];

  var COLD_FLU_STRONG = ['cold/flu', 'cold and flu', 'influenza', 'cough', 'fever', 'nasal congestion', 'decongest', 'sore throat', 'common cold', 'flu capsule', 'flu syrup', 'cold relief', 'night time cold', 'daytime cold'];

  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/['’]/g, "'")
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9+./]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function hasPhrase(text, phrase) {
    var t = String(text || '').toLowerCase();
    var p = normalize(phrase);
    if (!p) return false;
    if (p.indexOf(' ') !== -1) return normalize(t).indexOf(p) !== -1;
    return new RegExp('\\b' + escapeRe(p) + '\\b', 'i').test(t);
  }

  function getInfo(productId) {
    try {
      if (typeof PRODUCT_INFO !== 'undefined' && PRODUCT_INFO && PRODUCT_INFO[productId]) {
        return PRODUCT_INFO[productId];
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function usesText(product) {
    var info = getInfo(product.id);
    return (info && info.uses) ? String(info.uses) : '';
  }

  function productHaystack(product) {
    return String(product.name || '') + ' ' + usesText(product);
  }

  function expandNameTerms(q) {
    var raw = normalize(q);
    var terms = {};
    terms[raw] = true;
    Object.keys(NAME_ALIASES).forEach(function (alias) {
      if (raw === alias || raw.indexOf(alias) !== -1 || alias.indexOf(raw) !== -1) {
        terms[NAME_ALIASES[alias]] = true;
        terms[alias] = true;
      }
    });
    return {
      raw: raw,
      terms: Object.keys(terms),
      words: raw.split(/\s+/).filter(Boolean)
    };
  }

  // Name matching — same rules as the existing global / catalog search.
  function matchesName(product, expanded) {
    var name = (product.name || '').toLowerCase();
    var cat = (product.category || '').toLowerCase();
    if (!name) return false;
    if (expanded.raw && (name.indexOf(expanded.raw) !== -1 || cat.indexOf(expanded.raw) !== -1)) return true;
    var significant = expanded.words.filter(function (w) { return w.length >= 2; });
    if (significant.length > 1 && significant.every(function (w) { return name.indexOf(w) !== -1; })) {
      return true;
    }
    for (var i = 0; i < expanded.terms.length; i++) {
      var t = expanded.terms[i];
      if (t && t.length >= 2 && (name.indexOf(t) !== -1 || cat.indexOf(t) !== -1)) return true;
    }
    return false;
  }

  function scoreName(product, expanded) {
    var name = (product.name || '').toLowerCase();
    var score = 0;
    if (name === expanded.raw) score += 100;
    if (name.indexOf(expanded.raw) === 0) score += 40;
    if (name.indexOf(expanded.raw) !== -1) score += 20;
    expanded.terms.forEach(function (t) {
      if (t !== expanded.raw && name.indexOf(t) !== -1) score += 10;
    });
    score -= Math.min(name.length, 40) * 0.05;
    return score;
  }

  function queryMatchesCondition(qNorm, cond) {
    if (!qNorm) return false;
    var labels = [cond.id, normalize(cond.label)].concat((cond.aliases || []).map(normalize));
    for (var i = 0; i < labels.length; i++) {
      var a = labels[i];
      if (!a) continue;
      if (qNorm === a) return true;
      // The typed query contains this alias as a complete phrase ("eye medication" → eye)
      if (a.length >= 3 && hasPhrase(qNorm, a)) return true;
    }
    return false;
  }

  function conditionsForQuery(qNorm) {
    return CONDITIONS.filter(function (c) { return queryMatchesCondition(qNorm, c); });
  }

  function excluded(haystack, cond) {
    var list = cond.exclude || [];
    for (var i = 0; i < list.length; i++) {
      if (hasPhrase(haystack, list[i])) return true;
    }
    return false;
  }

  function productMatchesCondition(product, cond) {
    var hay = productHaystack(product);
    if (excluded(hay, cond)) return false;

    // Cold & flu: do not treat "cold sores" as a cold/flu match unless a true cold/flu phrase is present.
    if (cond.id === 'coldflu') {
      var strong = false;
      for (var s = 0; s < COLD_FLU_STRONG.length; s++) {
        if (hasPhrase(hay, COLD_FLU_STRONG[s])) { strong = true; break; }
      }
      // Bare "cold" or "flu" in the product name (Cold/Flu Capsules) also counts
      var name = String(product.name || '').toLowerCase();
      if (/\bcold\b/.test(name) || /\bflu\b/.test(name) || /\bcough\b/.test(name) || /\bfever\b/.test(name)) strong = true;
      if (hasPhrase(hay, 'cold sore') || hasPhrase(hay, 'cold sores')) return strong;
      if (strong) return true;
    }

    // Blood pressure: "pressure" in "eye pressure" is not a heart match
    if (cond.id === 'heart' && (hasPhrase(hay, 'eye pressure') || hasPhrase(hay, 'high eye pressure') || hasPhrase(hay, 'ocular hypertension') || hasPhrase(hay, 'pressure inside the eye') || hasPhrase(hay, 'intraocular'))) {
      var hasHeart = hasPhrase(hay, 'blood pressure') || hasPhrase(hay, 'heart failure') || hasPhrase(hay, 'heart attack') || hasPhrase(hay, 'angina') || hasPhrase(hay, 'cholesterol');
      if (!hasHeart) return false;
    }

    // Blood-pressure medicines that only mention diabetes for kidney protection
    if (cond.id === 'diabetes') {
      var treatsGlucose = hasPhrase(hay, 'blood sugar') || hasPhrase(hay, 'glucose') || hasPhrase(hay, 'metformin') || hasPhrase(hay, 'insulin') || hasPhrase(hay, 'glimepiride') || hasPhrase(hay, 'glipizide');
      if (!treatsGlucose && (hasPhrase(hay, 'blood pressure') || hasPhrase(hay, 'hypertension'))) return false;
    }

    // Pain relief: "chest pain" / angina belongs with blood pressure & heart, not this list
    if (cond.id === 'pain') {
      var painHits = false;
      var includePain = cond.include || [];
      for (var pi = 0; pi < includePain.length; pi++) {
        if (hasPhrase(hay, includePain[pi])) { painHits = true; break; }
      }
      if (!painHits) return false;
      var onlyChest = (hasPhrase(hay, 'chest pain') || hasPhrase(hay, 'angina'))
        && !hasPhrase(hay, 'nerve pain')
        && !hasPhrase(hay, 'muscle pain')
        && !hasPhrase(hay, 'joint pain')
        && !hasPhrase(hay, 'body pain')
        && !hasPhrase(hay, 'pain relief')
        && !hasPhrase(hay, 'headache')
        && !hasPhrase(hay, 'migraine')
        && !hasPhrase(hay, 'arthritis')
        && !hasPhrase(hay, 'gout')
        && !hasPhrase(hay, 'neuropathy')
        && !hasPhrase(hay, 'analgesic');
      if (onlyChest) return false;
      return true;
    }

    var include = cond.include || [];
    for (var i = 0; i < include.length; i++) {
      if (hasPhrase(hay, include[i])) return true;
    }

    // Vitamins catalog category itself
    if (cond.id === 'vitamins' && (product.category === 'vitamins')) return true;
    return false;
  }

  function usesMatchesQuery(product, qNorm) {
    if (!qNorm || qNorm.length < 3) return false;
    var uses = normalize(usesText(product));
    if (!uses) return false;
    if (uses.indexOf(qNorm) !== -1) return true;
    var words = qNorm.split(/\s+/).filter(function (w) { return w.length >= 3; });
    if (words.length > 1 && words.every(function (w) { return uses.indexOf(w) !== -1; })) return true;
    return false;
  }


  // Narrow queries should not return an entire condition list (e.g. "cough" ≠ every cold & flu item).
  var SPECIFIC_QUERY_PHRASES = {
    cough: ['cough', 'coughing'],
    fever: ['fever', 'fevers', 'pyrexia'],
    'belly running': ['diarrhea', 'diarrhoea', 'loose stool', 'loose stools', 'loperamide', 'running stomach', 'running belly', 'belly running'],
    'running stomach': ['diarrhea', 'diarrhoea', 'loose stool', 'loose stools', 'loperamide', 'running stomach', 'running belly', 'belly running'],
    'running belly': ['diarrhea', 'diarrhoea', 'loose stool', 'loose stools', 'loperamide', 'running stomach', 'running belly', 'belly running'],
    diarrhea: ['diarrhea', 'diarrhoea', 'loose stool', 'loose stools', 'loperamide'],
    diarrhoea: ['diarrhea', 'diarrhoea', 'loose stool', 'loose stools', 'loperamide'],
    constipation: ['constipation', 'laxative', 'senna'],
    heartburn: ['heartburn', 'reflux', 'antacid', 'omeprazole', 'esomeprazole', 'pantoprazole'],
    headache: ['headache', 'headaches', 'migraine'],
    migraine: ['migraine', 'migraines'],
    'itchy eyes': ['itchy eyes', 'watery eyes', 'itchy or watery eyes', 'eye'],
    'watery eyes': ['itchy eyes', 'watery eyes', 'itchy or watery eyes', 'eye']
  };

  function matchesSymptom(product, query) {
    var qNorm = normalize(query);
    if (!qNorm) return false;
    var conds = conditionsForQuery(qNorm);
    // When the query maps to a known need, only use that condition map.
    // Free-form "uses" matching is for terms like "gout" or "glaucoma".
    if (conds.length) {
      var inCondition = false;
      for (var i = 0; i < conds.length; i++) {
        if (productMatchesCondition(product, conds[i])) { inCondition = true; break; }
      }
      if (!inCondition) return false;
      var specific = SPECIFIC_QUERY_PHRASES[qNorm];
      if (specific && specific.length) {
        var hay = productHaystack(product);
        return specific.some(function (phrase) {
          if (phrase === 'fever' || phrase === 'fevers') {
            var stripped = String(hay).replace(/hay fever/gi, '');
            return hasPhrase(stripped, phrase);
          }
          return hasPhrase(hay, phrase);
        });
      }
      return true;
    }
    if (usesMatchesQuery(product, qNorm)) return true;
    return false;
  }

  function searchProducts(list, query, mode) {
    var products = (list || []).filter(function (p) { return p && p.name && !p.adminOnly; });
    var q = normalize(query);
    if (!q) return { query: query, mode: mode || 'all', results: [], nameResults: [], symptomResults: [], conditions: [] };
    var expanded = expandNameTerms(query);
    var conds = conditionsForQuery(q);
    mode = mode || 'all';

    var nameResults = [];
    var symptomResults = [];
    if (mode === 'all' || mode === 'name') {
      nameResults = products.filter(function (p) { return matchesName(p, expanded); })
        .sort(function (a, b) { return scoreName(b, expanded) - scoreName(a, expanded); });
    }
    if (mode === 'all' || mode === 'symptom') {
      symptomResults = products.filter(function (p) { return matchesSymptom(p, query); })
        .sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
    }

    var seen = {};
    var results = [];
    function add(p, via) {
      if (!p || !p.id || seen[p.id]) return;
      seen[p.id] = via;
      var row = {};
      for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k)) row[k] = p[k];
      row.matchVia = via;
      results.push(row);
    }
    // Name matches first (keeps today's "type a medicine name" feel), then other symptom matches.
    nameResults.forEach(function (p) { add(p, 'name'); });
    symptomResults.forEach(function (p) { add(p, seen[p.id] ? seen[p.id] : 'symptom'); });

    return {
      query: query,
      mode: mode,
      results: results,
      nameResults: nameResults,
      symptomResults: symptomResults,
      conditions: conds,
      nameCount: nameResults.length,
      symptomCount: symptomResults.length
    };
  }

  function filterProducts(list, query, mode) {
    return searchProducts(list, query, mode).results;
  }

  function startingPrice(product) {
    var fallback = Number(product && product.price);
    if (typeof getPartPack === 'function' && product && product.id) {
      var opts = getPartPack(product.id);
      if (opts && opts.length) {
        var prices = opts.map(function (o) { return Number(o.price); }).filter(function (n) { return !isNaN(n); });
        if (prices.length) return Math.min.apply(null, prices);
      }
    }
    return fallback;
  }

  function isRx(product) {
    var cat = (product && product.category) || '';
    return cat === 'prescription' || cat === 'rx';
  }

  function priceLabel(product) {
    if (isRx(product)) return 'Call for pricing';
    var n = startingPrice(product);
    if (isNaN(n)) return '';
    return 'From $' + n.toFixed(2);
  }

  function photoUrl(product) {
    if (!product || !product.id) return '';
    if (typeof productJpgUrl === 'function') {
      var url = productJpgUrl(product.id);
      if (url) return url;
    }
    return '/assets/products/' + product.id + '.jpg';
  }

  function conditionsList() {
    return CONDITIONS.map(function (c) { return { id: c.id, label: c.label }; });
  }

  function activeConditions(query) {
    return conditionsForQuery(normalize(query)).map(function (c) { return { id: c.id, label: c.label }; });
  }

  root.DucorSymptomSearch = {
    CONDITIONS: CONDITIONS,
    NAME_ALIASES: NAME_ALIASES,
    normalize: normalize,
    searchProducts: searchProducts,
    filterProducts: filterProducts,
    matchesName: function (product, query) { return matchesName(product, expandNameTerms(query)); },
    matchesSymptom: matchesSymptom,
    startingPrice: startingPrice,
    priceLabel: priceLabel,
    photoUrl: photoUrl,
    isRx: isRx,
    conditionsList: conditionsList,
    activeConditions: activeConditions,
    DISCLAIMER: 'This is not medical advice. Ask a Ducor pharmacist if you are unsure which medicine is right for you.'
  };
})(typeof window !== 'undefined' ? window : this);
