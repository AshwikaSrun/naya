const NAYA_BASE = 'https://www.nayaeditorial.shop';
const PRICE_CACHE_TTL = 10 * 60 * 1000; // 10 min
const priceCache = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PRICE_CHECK') {
    handlePriceCheck(msg.query).then(sendResponse);
    return true;
  }

  if (msg.type === 'FIND_CHEAPER') {
    const url = `${NAYA_BASE}/?q=${encodeURIComponent(msg.query)}`;
    chrome.tabs.create({ url });
    return false;
  }

  if (msg.type === 'SAVE_WISHLIST') {
    saveToWishlist(msg.item).then(sendResponse);
    return true;
  }

  if (msg.type === 'GET_WISHLIST') {
    getWishlist().then(sendResponse);
    return true;
  }

  if (msg.type === 'REMOVE_WISHLIST') {
    removeFromWishlist(msg.url).then(sendResponse);
    return true;
  }

  if (msg.type === 'TRACK_VIEW') {
    trackView(msg.item);
    return false;
  }
});

async function handlePriceCheck(query) {
  const cacheKey = query.toLowerCase().trim();
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < PRICE_CACHE_TTL) {
    return cached.data;
  }

  try {
    const r = await fetch(`${NAYA_BASE}/api/price-check?query=${encodeURIComponent(query)}`);
    if (!r.ok) return null;
    const data = await r.json();
    if (data && data.count > 0) {
      priceCache.set(cacheKey, { data, ts: Date.now() });
    }
    return data;
  } catch {
    return null;
  }
}

async function saveToWishlist(item) {
  const { wishlist = [] } = await chrome.storage.local.get('wishlist');
  if (wishlist.some((w) => w.url === item.url)) return { saved: false, reason: 'already saved' };
  wishlist.unshift({ ...item, savedAt: Date.now() });
  if (wishlist.length > 200) wishlist.length = 200;
  await chrome.storage.local.set({ wishlist });
  return { saved: true };
}

async function getWishlist() {
  const { wishlist = [] } = await chrome.storage.local.get('wishlist');
  return wishlist;
}

async function removeFromWishlist(url) {
  const { wishlist = [] } = await chrome.storage.local.get('wishlist');
  const updated = wishlist.filter((w) => w.url !== url);
  await chrome.storage.local.set({ wishlist: updated });
  return { removed: true };
}

function trackView(item) {
  chrome.storage.local.get('views', ({ views = [] }) => {
    views.unshift({ ...item, viewedAt: Date.now() });
    if (views.length > 500) views.length = 500;
    chrome.storage.local.set({ views });
  });
}
