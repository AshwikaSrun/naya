// Naya Price Intelligence — Listing Page Content Script
// Features: Price overlay, deal score, find cheaper, save to wishlist, duplicate detection

const NAYA_URL = 'https://www.nayaeditorial.shop';

(function () {
  if (document.getElementById('naya-overlay')) return;

  // Wait a moment for SPAs to finish rendering
  setTimeout(init, 800);
})();

function init() {
  const info = extractListingInfo();
  if (!info || !info.title) return;

  // Track this view
  chrome.runtime.sendMessage({ type: 'TRACK_VIEW', item: info });

  const container = document.createElement('div');
  container.id = 'naya-overlay';
  document.body.appendChild(container);

  renderLoading(container);

  const query = buildQuery(info.title);

  chrome.runtime.sendMessage({ type: 'PRICE_CHECK', query }, (data) => {
    if (data && data.medianPrice !== null && data.count > 0) {
      renderFullOverlay(container, data, info, query);
    } else {
      renderMinimalOverlay(container, info, query);
    }

    // Fetch cross-listings in background, append when ready
    chrome.runtime.sendMessage(
      { type: 'CROSS_LISTINGS', query, source: info.source, price: info.price },
      (crossData) => {
        if (crossData && crossData.listings && crossData.listings.length > 0) {
          appendCrossListings(container, crossData, info);
        }
      }
    );
  });
}

// ── Listing info extraction per platform ──

function extractListingInfo() {
  const host = window.location.hostname;
  const info = { title: '', price: 0, priceRaw: '', source: '', url: window.location.href, image: '' };

  if (host.includes('ebay.com')) {
    info.source = 'ebay';
    info.title = getText('h1.x-item-title__mainTitle span') ||
                 getText('h1[itemprop="name"]') || getText('h1');
    info.priceRaw = getText('[itemprop="price"]') ||
                    getText('.x-price-primary span') || getText('#prcIsum');
    info.image = getAttr('.ux-image-carousel-item img', 'src') ||
                 getAttr('[itemprop="image"]', 'src') || '';
  } else if (host.includes('grailed.com')) {
    info.source = 'grailed';
    info.title = getText('[class*="ListingTitle"]') || getText('h1');
    info.priceRaw = getText('[class*="Price"]') || getText('[data-testid="listing-price"]');
    info.image = getAttr('[class*="ListingImage"] img', 'src') ||
                 getAttr('meta[property="og:image"]', 'content') || '';
  } else if (host.includes('depop.com')) {
    info.source = 'depop';
    info.title = getText('[data-testid="product__title"]') || getText('h1');
    info.priceRaw = getText('[data-testid="product__price"]') || getText('[aria-label*="price"]');
    info.image = getAttr('[data-testid="product__image"] img', 'src') ||
                 getAttr('meta[property="og:image"]', 'content') || '';
  } else if (host.includes('poshmark.com')) {
    info.source = 'poshmark';
    info.title = getText('[data-test="listing-title"]') || getText('h1');
    info.priceRaw = getText('[data-test="listing-price"]') || getText('.listing__ipad-price');
    info.image = getAttr('.covershot-image img', 'src') ||
                 getAttr('meta[property="og:image"]', 'content') || '';
  }

  info.price = parsePrice(info.priceRaw);
  return info;
}

function getText(sel) {
  const el = document.querySelector(sel);
  return el ? el.textContent.trim() : '';
}

function getAttr(sel, attr) {
  const el = document.querySelector(sel);
  return el ? (el.getAttribute(attr) || '') : '';
}

function parsePrice(raw) {
  if (!raw) return 0;
  const match = raw.replace(/,/g, '').match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

function buildQuery(title) {
  const stopWords = new Set([
    'vintage', 'rare', 'authentic', 'genuine', 'new', 'nwt', 'nwot', 'used', 'pre-owned',
    'size', 'sz', 'mens', 'womens', 'unisex', 'free', 'shipping', 'sold', 'bundle',
    'a', 'an', 'the', 'and', 'or', 'for', 'in', 'on', 'with', 'of', 'by',
  ]);
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w))
    .slice(0, 5)
    .join(' ');
}

// ── Cross-Listing Detection ──

function appendCrossListings(container, crossData, info) {
  const body = container.querySelector('#naya-body');
  if (!body) return;

  const listings = crossData.listings;
  const currentPrice = info.price;

  const rows = listings.map((l) => {
    const cheaper = currentPrice > 0 && l.price < currentPrice;
    const savings = cheaper ? Math.round(currentPrice - l.price) : 0;
    return `
      <a href="${l.url}" target="_blank" rel="noopener" class="naya-cross-row ${cheaper ? 'naya-cross-cheaper' : ''}">
        <div class="naya-cross-source">${l.source}</div>
        <div class="naya-cross-price">$${Math.round(l.price)}</div>
        ${cheaper ? `<div class="naya-cross-save">save $${savings}</div>` : ''}
      </a>`;
  }).join('');

  const cheaperCount = crossData.cheaperCount || 0;
  const heading = cheaperCount > 0
    ? `found ${cheaperCount} cheaper listing${cheaperCount > 1 ? 's' : ''}`
    : 'also listed on';

  const section = document.createElement('div');
  section.className = 'naya-cross-section';
  section.innerHTML = `
    <div class="naya-label">${heading}</div>
    <div class="naya-cross-list">${rows}</div>
  `;

  const actions = body.querySelector('.naya-actions');
  if (actions) {
    body.insertBefore(section, actions);
  } else {
    body.appendChild(section);
  }
}

// ── Rendering ──

function brandedHeader(showMinimize) {
  return `
    <div class="naya-header">
      <div class="naya-header-left">
        <div class="naya-logo-mark">n</div>
        <div>
          <div class="naya-logo-text">naya</div>
          <div class="naya-logo-sub">price intelligence</div>
        </div>
      </div>
      <div class="naya-header-actions">
        ${showMinimize ? '<button class="naya-minimize-btn" data-action="minimize" title="Minimize">&#x2015;</button>' : ''}
        <button class="naya-close-btn" data-action="close">&times;</button>
      </div>
    </div>`;
}

function renderLoading(container) {
  container.innerHTML = `
    <div class="naya-card">
      ${brandedHeader(false)}
      <div class="naya-loading">
        <div class="naya-spinner"></div>
        <span>checking prices across platforms...</span>
      </div>
    </div>
  `;
  bindClose(container);
}

function renderFullOverlay(container, data, info, query) {
  const listingPrice = info.price;
  const marketPrice = data.medianPrice;

  // Deal score — big, bold, screenshot-worthy
  let dealHtml = '';
  if (listingPrice > 0 && marketPrice > 0) {
    const diff = marketPrice - listingPrice;
    const pct = Math.round((diff / marketPrice) * 100);
    const absDiff = Math.abs(Math.round(diff));
    if (pct >= 15) {
      dealHtml = `
        <div class="naya-verdict naya-verdict-steal">
          <div class="naya-verdict-emoji">&#128293;</div>
          <div class="naya-verdict-main">${pct}% below market</div>
          <div class="naya-verdict-detail">you save $${absDiff} vs. the $${Math.round(marketPrice)} average</div>
        </div>`;
    } else if (pct > 0) {
      dealHtml = `
        <div class="naya-verdict naya-verdict-good">
          <div class="naya-verdict-emoji">&#9989;</div>
          <div class="naya-verdict-main">${pct}% below market</div>
          <div class="naya-verdict-detail">$${absDiff} under the $${Math.round(marketPrice)} average</div>
        </div>`;
    } else if (pct > -5) {
      dealHtml = `
        <div class="naya-verdict naya-verdict-fair">
          <div class="naya-verdict-main">fair price</div>
          <div class="naya-verdict-detail">right at the $${Math.round(marketPrice)} market average</div>
        </div>`;
    } else {
      dealHtml = `
        <div class="naya-verdict naya-verdict-overpriced">
          <div class="naya-verdict-emoji">&#9888;&#65039;</div>
          <div class="naya-verdict-main">overpriced by $${absDiff}</div>
          <div class="naya-verdict-detail">market average is $${Math.round(marketPrice)} — this listing is ${Math.abs(pct)}% above</div>
        </div>`;
    }
  }

  // Platform breakdown
  let platformsHtml = '';
  if (data.byPlatform && Object.keys(data.byPlatform).length > 1) {
    const pills = Object.entries(data.byPlatform).slice(0, 4).map(([name, stats]) => {
      const isCurrent = name.toLowerCase() === info.source.toLowerCase();
      return `
        <div class="naya-plat-pill ${isCurrent ? 'naya-plat-current' : ''}">
          <div class="naya-plat-name">${name}</div>
          <div class="naya-plat-price">$${Math.round(stats.median)}</div>
          <div class="naya-plat-count">${stats.count}</div>
        </div>`;
    }).join('');
    platformsHtml = `
      <div class="naya-section">
        <div class="naya-label">also listed on</div>
        <div class="naya-plats">${pills}</div>
      </div>`;
  }

  container.innerHTML = `
    <div class="naya-card">
      ${brandedHeader(true)}
      <div class="naya-body" id="naya-body">
        ${dealHtml}

        <div class="naya-prices">
          <div class="naya-price-col">
            <div class="naya-label">market price</div>
            <div class="naya-big-price">$${Math.round(marketPrice)}</div>
            ${data.trend30d !== null ? `<div class="naya-trend-sm ${data.trend30d > 0 ? 'up' : data.trend30d < 0 ? 'down' : ''}">${data.trend30d > 0 ? '+' : ''}${data.trend30d}% 30d</div>` : ''}
          </div>
          <div class="naya-price-col">
            <div class="naya-label">this listing</div>
            <div class="naya-big-price">${listingPrice > 0 ? '$' + Math.round(listingPrice) : '—'}</div>
            <div class="naya-source-tag">${info.source}</div>
          </div>
        </div>

        ${data.priceRange ? `<div class="naya-range-bar"><div class="naya-label">range</div><span>$${Math.round(data.priceRange.min)} — $${Math.round(data.priceRange.max)} across ${data.count} listings</span></div>` : ''}

        ${platformsHtml}

        <div class="naya-actions">
          <button class="naya-btn naya-btn-primary" data-action="find-cheaper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            find cheaper listings
          </button>
          <button class="naya-btn naya-btn-secondary" data-action="save-wishlist">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.682l-7.682-7.318a4.5 4.5 0 010-6.364z"/></svg>
            save to naya
          </button>
        </div>
      </div>
      <div class="naya-footer"><div class="naya-footer-text">powered by naya — resale search engine</div></div>
    </div>
  `;

  bindActions(container, info, query);
}

function renderMinimalOverlay(container, info, query) {
  container.innerHTML = `
    <div class="naya-card">
      ${brandedHeader(true)}
      <div class="naya-body" id="naya-body">
        <div class="naya-empty-msg">No market data yet for this item.</div>
        <div class="naya-actions">
          <button class="naya-btn naya-btn-primary" data-action="find-cheaper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            search on naya
          </button>
          <button class="naya-btn naya-btn-secondary" data-action="save-wishlist">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.682l-7.682-7.318a4.5 4.5 0 010-6.364z"/></svg>
            save to naya
          </button>
        </div>
      </div>
      <div class="naya-footer"><div class="naya-footer-text">powered by naya — resale search engine</div></div>
    </div>
  `;

  bindActions(container, info, query);
}

function renderMinimized(container, info, query) {
  container.innerHTML = `
    <button class="naya-fab" data-action="expand" title="Open naya Price Check">
      <span class="naya-fab-logo">n</span>
    </button>
  `;
  container.querySelector('[data-action="expand"]').addEventListener('click', () => {
    renderLoading(container);
    chrome.runtime.sendMessage({ type: 'PRICE_CHECK', query }, (data) => {
      if (data && data.medianPrice !== null && data.count > 0) {
        renderFullOverlay(container, data, info, query);
      } else {
        renderMinimalOverlay(container, info, query);
      }
    });
  });
}

// ── Actions ──

function bindClose(container) {
  container.querySelectorAll('[data-action="close"]').forEach((btn) => {
    btn.addEventListener('click', () => container.remove());
  });
}

function bindActions(container, info, query) {
  bindClose(container);

  container.querySelectorAll('[data-action="minimize"]').forEach((btn) => {
    btn.addEventListener('click', () => renderMinimized(container, info, query));
  });

  container.querySelectorAll('[data-action="find-cheaper"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'FIND_CHEAPER', query });
    });
  });

  container.querySelectorAll('[data-action="save-wishlist"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = {
        title: info.title,
        price: info.price,
        source: info.source,
        url: info.url,
        image: info.image,
      };
      chrome.runtime.sendMessage({ type: 'SAVE_WISHLIST', item }, (res) => {
        if (res && res.saved) {
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0"><path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.682l-7.682-7.318a4.5 4.5 0 010-6.364z"/></svg> Saved!`;
          btn.disabled = true;
          btn.classList.add('naya-btn-saved');
        } else {
          btn.textContent = 'Already saved';
          btn.disabled = true;
        }
      });
    });
  });
}
