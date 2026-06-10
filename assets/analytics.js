// Ducor Pharmacy — Visitor Analytics Tracker
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, setDoc, updateDoc, increment, serverTimestamp, collection, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const FB_CONFIG = {
  apiKey: "AIzaSyB2N6CcL0cGxBLfSdPANHJjjKuP5Rp0EIE",
  authDomain: "ducor-pharmacy.firebaseapp.com",
  projectId: "ducor-pharmacy",
  storageBucket: "ducor-pharmacy.firebasestorage.app",
  messagingSenderId: "952933384266",
  appId: "1:952933384266:web:55b906e903d96940d426b3"
};

const app = getApps().length ? getApps()[0] : initializeApp(FB_CONFIG);
const db = getFirestore(app);

function getPageName() {
  const path = location.pathname;
  if (path.includes('prescription')) return 'Prescription';
  if (path.includes('otc')) return 'OTC';
  if (path.includes('vitamins')) return 'Vitamins';
  if (path.includes('checkout')) return 'Checkout';
  if (path.includes('index') || path === '/') return 'Homepage';
  return 'Other';
}

function getDevice() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
}

function getReferrer() {
  const ref = document.referrer;
  if (!ref) return 'Direct';
  if (ref.includes('google') || ref.includes('bing') || ref.includes('yahoo')) return 'Search';
  if (ref.includes('facebook') || ref.includes('instagram') || ref.includes('twitter') || ref.includes('tiktok')) return 'Social';
  if (ref.includes(location.hostname)) return 'Internal';
  return 'Referral';
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function trackVisit() {
  try {
    const page = getPageName();
    const device = getDevice();
    const source = getReferrer();
    const todayKey = getTodayKey();
    const hour = new Date().getHours();

    // 1. Increment daily summary (cheap — one doc per day)
    const dayRef = doc(db, 'analytics_days', todayKey);
    await setDoc(dayRef, {
      date: todayKey,
      total: increment(1),
      [`pages.${page}`]: increment(1),
      [`devices.${device}`]: increment(1),
      [`sources.${source}`]: increment(1),
      [`hours.h${hour}`]: increment(1),
      lastSeen: serverTimestamp()
    }, { merge: true });

    // 2. Log individual visit (for live visitors feed)
    await addDoc(collection(db, 'analytics_visits'), {
      page,
      device,
      source,
      ts: serverTimestamp(),
      lang: navigator.language || 'unknown'
    });

    // 3. Track time on page (fire on unload)
    const start = Date.now();
    window.addEventListener('beforeunload', async () => {
      const seconds = Math.round((Date.now() - start) / 1000);
      if (seconds < 2) return;
      try {
        await setDoc(dayRef, {
          [`timeOnPage.${page}`]: increment(seconds),
          [`timeOnPageCount.${page}`]: increment(1)
        }, { merge: true });
      } catch(e) {}
    });

  } catch(e) {
    // Silent fail — never break the shop page
  }
}

trackVisit();
