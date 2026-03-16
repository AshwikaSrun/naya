// Naya Deal Scanner — Search Results Page Content Script
// Scans marketplace search results and highlights deals

const NAYA_URL = 'https://www.nayaeditorial.shop';
const SCAN_DELAY = 1500;
const BADGE_CLASS = 'naya-deal-badge';

(function () {
  if (document.querySelector(`.${BADGE_CLASS}`)) return;
  setTimeout(scanListings, SCAN_DELAY);

  // Re-scan on infinite scroll / dynamic content
  const observer = new MutationObserver(debounce(() => scanListings(), 2000));
  observer.observe(document.body, { childList: true, subtree: true });
})();

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

async function scanListings() {
  const host = window.location.hostname;
  let cards = [];

  if (host.includes('ebay.com')) {
    cards = extractEbayCards();
  } else if (host.includes('grailed.com')) {
    cards = extractGrailedCards();
  } else if (host.includes('depop.com')) {
    cards = extractDepopCards();
  } else if (host.includes('poshmark.com')) {
    cards = extractPoshmarkCards();
  }

  if (cards.length === 0) return;

  // Build a combined query from the page's search query
  const pageQuery = getSearchQuery();
  if (!pageQuery) return;

  chrome.runtime.sendMessage({ type: 'PRICE_CHECK', query: pageQuery }, (data) => {
    if (!data || data.medianPrice === null || data.count === 0) return;
    const marketPrice = data.medianPrice;

    for (const card of cards) {
      if (card.element.querySelector(`.${BADGE_CLASS}`)) continue;
      if (card.price <= 0) continue;

      const diff = marketPrice - card.price;
      const pct = Math.round((diff / marketPrice) * 100);
      const absDiff = Math.abs(Math.round(diff));

      if (pct >= 20) {
        injectBadge(card.element, pct, absDiff, 'good');
      } else if (pct <= -15) {
        injectBadge(card.element, Math.abs(pct), absDiff, 'bad');
      }
    }
  });
}

function getSearchQuery() {
  const host = window.location.hostname;
  const url = new URL(window.location.href);

  if (host.includes('ebay.com')) return url.searchParams.get('_nkw') || '';
  if (host.includes('depop.com')) return url.pathname.split('/search/')[1]?.replace(/-/g, ' ') || url.searchParams.get('q') || '';
  if (host.includes('poshmark.com')) return url.searchParams.get('query') || '';
  if (host.includes('grailed.com')) {
    return document.querySelector('input[type="search"]')?.value || '';
  }
  return '';
}

// ── Card extraction per platform ──

function extractEbayCards() {
  return Array.from(document.querySelectorAll('.s-item')).map((el) => {
    const priceEl = el.querySelector('.s-item__price');
    const price = priceEl ? parsePrice(priceEl.textContent) : 0;
    return { element: el, price };
  }).filter((c) => c.price > 0);
}

function extractGrailedCards() {
  return Array.from(document.querySelectorAll('[class*="feed-item"], [class*="FeedItem"], a[href*="/listings/"]')).map((el) => {
    const priceEl = el.querySelector('[class*="Price"], [class*="price"]');
    const price = priceEl ? parsePrice(priceEl.textContent) : 0;
    return { element: el, price };
  }).filter((c) => c.price > 0);
}

function extractDepopCards() {
  return Array.from(document.querySelectorAll('[data-testid*="product"], a[href*="/products/"]')).map((el) => {
    const priceEl = el.querySelector('[class*="price"], [aria-label*="price"]');
    const price = priceEl ? parsePrice(priceEl.textContent) : 0;
    return { element: el, price };
  }).filter((c) => c.price > 0);
}

function extractPoshmarkCards() {
  return Array.from(document.querySelectorAll('[data-test="tile"], .card')).map((el) => {
    const priceEl = el.querySelector('[data-test="tile-price"], .price');
    const price = priceEl ? parsePrice(priceEl.textContent) : 0;
    return { element: el, price };
  }).filter((c) => c.price > 0);
}

function parsePrice(raw) {
  if (!raw) return 0;
  const match = raw.replace(/,/g, '').match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

// ── Badge injection ──

function injectBadge(element, pct, dollarDiff, type) {
  const existing = element.querySelector(`.${BADGE_CLASS}`);
  if (existing) return;

  const pos = window.getComputedStyle(element).position;
  if (pos === 'static') element.style.position = 'relative';

  const badge = document.createElement('div');
  badge.className = `${BADGE_CLASS} naya-badge-${type}`;

  if (type === 'good') {
    badge.innerHTML = `<span class="naya-badge-fire">&#128293;</span> ${pct}% below · save $${dollarDiff}`;
  } else {
    badge.innerHTML = `<span class="naya-badge-warn">&#9888;&#65039;</span> $${dollarDiff} overpriced`;
  }

  element.appendChild(badge);
}
