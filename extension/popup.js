const NAYA_API = 'https://www.nayaeditorial.shop/api/price-check';

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-home').classList.toggle('hidden', tab.dataset.tab !== 'home');
      document.getElementById('tab-wishlist').classList.toggle('hidden', tab.dataset.tab !== 'wishlist');
      if (tab.dataset.tab === 'wishlist') loadWishlist();
    });
  });

  loadStats();
  checkCurrentPage();
});

async function checkCurrentPage() {
  const container = document.getElementById('price-check');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showNonMarketplace(container);
      return;
    }

    const url = tab.url;
    const isMarketplace = url.includes('ebay.com/itm') ||
                          url.includes('grailed.com/listings') ||
                          url.includes('depop.com/products') ||
                          url.includes('poshmark.com/listing');

    if (!isMarketplace) {
      showNonMarketplace(container);
      return;
    }

    // Get listing info from content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageInfo,
    });

    const info = results?.[0]?.result;
    if (!info || !info.title) {
      showNonMarketplace(container);
      return;
    }

    // Build query and fetch price data
    const query = buildQuery(info.title);
    const res = await fetch(`${NAYA_API}?query=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data && data.medianPrice !== null && data.count > 0) {
      renderPriceCheck(container, data, info);
    } else {
      showNoData(container, info);
    }
  } catch (err) {
    showNonMarketplace(container);
  }
}

function extractPageInfo() {
  const host = window.location.hostname;
  const info = { title: '', price: 0, source: '' };

  if (host.includes('ebay.com')) {
    info.source = 'ebay';
    const el = document.querySelector('h1.x-item-title__mainTitle span') ||
               document.querySelector('h1[itemprop="name"]') ||
               document.querySelector('h1');
    info.title = el ? el.textContent.trim() : '';
    const priceEl = document.querySelector('[itemprop="price"]') ||
                    document.querySelector('.x-price-primary span') ||
                    document.querySelector('#prcIsum');
    const raw = priceEl ? priceEl.textContent.trim() : '';
    const m = raw.replace(/,/g, '').match(/(\d+\.?\d*)/);
    info.price = m ? parseFloat(m[1]) : 0;
  } else if (host.includes('grailed.com')) {
    info.source = 'grailed';
    const el = document.querySelector('[class*="ListingTitle"]') || document.querySelector('h1');
    info.title = el ? el.textContent.trim() : '';
    const priceEl = document.querySelector('[class*="Price"]');
    const raw = priceEl ? priceEl.textContent.trim() : '';
    const m = raw.replace(/,/g, '').match(/(\d+\.?\d*)/);
    info.price = m ? parseFloat(m[1]) : 0;
  } else if (host.includes('depop.com')) {
    info.source = 'depop';
    const el = document.querySelector('[data-testid="product__title"]') || document.querySelector('h1');
    info.title = el ? el.textContent.trim() : '';
    const priceEl = document.querySelector('[data-testid="product__price"]');
    const raw = priceEl ? priceEl.textContent.trim() : '';
    const m = raw.replace(/,/g, '').match(/(\d+\.?\d*)/);
    info.price = m ? parseFloat(m[1]) : 0;
  } else if (host.includes('poshmark.com')) {
    info.source = 'poshmark';
    const el = document.querySelector('[data-test="listing-title"]') || document.querySelector('h1');
    info.title = el ? el.textContent.trim() : '';
    const priceEl = document.querySelector('[data-test="listing-price"]');
    const raw = priceEl ? priceEl.textContent.trim() : '';
    const m = raw.replace(/,/g, '').match(/(\d+\.?\d*)/);
    info.price = m ? parseFloat(m[1]) : 0;
  }
  return info;
}

function buildQuery(title) {
  const stopWords = new Set([
    'vintage', 'rare', 'authentic', 'genuine', 'new', 'nwt', 'nwot', 'used', 'pre-owned',
    'size', 'sz', 'mens', 'womens', 'unisex', 'free', 'shipping', 'sold', 'bundle',
    'tags', 'with', 'a', 'an', 'the', 'and', 'or', 'for', 'in', 'on', 'of', 'by',
  ]);
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w))
    .slice(0, 5)
    .join(' ');
}

function renderPriceCheck(container, data, info) {
  const listingPrice = info.price;
  const marketPrice = data.medianPrice;
  const diff = marketPrice - listingPrice;
  const pct = listingPrice > 0 ? Math.round((diff / marketPrice) * 100) : null;

  let dealHtml = '';
  if (pct !== null) {
    if (pct > 0) {
      dealHtml = `<div class="pci-deal pci-deal-good">&#128293; ${pct}% below market</div>`;
    } else if (pct < -5) {
      dealHtml = `<div class="pci-deal pci-deal-bad">&#9888;&#65039; Overpriced by $${Math.abs(Math.round(diff))}</div>`;
    } else {
      dealHtml = `<div class="pci-deal pci-deal-fair">Fair price — at market value</div>`;
    }
  }

  let platHtml = '';
  if (data.byPlatform && Object.keys(data.byPlatform).length > 1) {
    const pills = Object.entries(data.byPlatform).slice(0, 4).map(([name, s]) =>
      `<div class="pci-plat"><div class="pci-plat-name">${name}</div><div class="pci-plat-price">$${Math.round(s.median)}</div></div>`
    ).join('');
    platHtml = `<div class="pci-platforms">${pills}</div>`;
  }

  container.innerHTML = `
    <div class="price-check-title">price check — ${esc(info.source)}</div>
    <div class="price-check-item">
      <div class="pci-title">${esc(info.title)}</div>
      <div class="pci-source">${esc(info.source)}</div>
      <div class="pci-prices">
        <div class="pci-col">
          <div class="pci-label">Market</div>
          <div class="pci-value">$${Math.round(marketPrice)}</div>
        </div>
        <div class="pci-col">
          <div class="pci-label">This listing</div>
          <div class="pci-value">${listingPrice > 0 ? '$' + Math.round(listingPrice) : '—'}</div>
        </div>
      </div>
      ${dealHtml}
      ${platHtml}
    </div>
  `;
}

function showNoData(container, info) {
  container.innerHTML = `
    <div class="price-check-title">price check — ${esc(info.source)}</div>
    <div class="price-check-item">
      <div class="pci-title">${esc(info.title)}</div>
      <div class="pci-source">${esc(info.source)}</div>
      <div class="pci-none">No market data yet for this item.<br>Search on naya to start building price data.</div>
    </div>
  `;
}

function showNonMarketplace(container) {
  container.innerHTML = `
    <div class="pci-none">
      Visit a listing on eBay, Grailed, Depop, or Poshmark to see price comparisons.
    </div>
  `;
}

function loadStats() {
  chrome.storage.local.get(['views', 'wishlist'], ({ views = [], wishlist = [] }) => {
    document.getElementById('stat-views').textContent = views.length;
    document.getElementById('stat-saved').textContent = wishlist.length;
  });
}

function loadWishlist() {
  chrome.runtime.sendMessage({ type: 'GET_WISHLIST' }, (wishlist) => {
    const list = document.getElementById('wishlist-list');
    const empty = document.getElementById('wishlist-empty');

    if (!wishlist || wishlist.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.innerHTML = wishlist.map((item) => `
      <li class="wishlist-item" data-url="${esc(item.url)}">
        ${item.image ? `<img class="wl-img" src="${esc(item.image)}" alt="">` : '<div class="wl-img"></div>'}
        <div class="wl-info">
          <div class="wl-title">${esc(item.title || 'Untitled')}</div>
          <div class="wl-meta">${esc(item.source || '')} &middot; saved ${timeAgo(item.savedAt)}</div>
        </div>
        <div class="wl-price">${item.price ? '$' + Math.round(item.price) : ''}</div>
        <button class="wl-remove" data-remove="${esc(item.url)}" title="Remove">&times;</button>
      </li>
    `).join('');

    list.querySelectorAll('.wishlist-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('wl-remove')) return;
        chrome.tabs.create({ url: el.dataset.url });
      });
    });

    list.querySelectorAll('.wl-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        chrome.runtime.sendMessage({ type: 'REMOVE_WISHLIST', url: btn.dataset.remove }, () => {
          loadWishlist();
          loadStats();
        });
      });
    });
  });
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
