// Naya Price Intelligence — Content Script
// Injects an overlay on marketplace listing pages showing cross-platform price data

const NAYA_API = 'https://www.nayaeditorial.shop/api/insights/price-index';

(function () {
  if (document.getElementById('naya-overlay')) return;

  const info = extractListingInfo();
  if (!info || !info.title) return;

  const container = document.createElement('div');
  container.id = 'naya-overlay';
  document.body.appendChild(container);

  renderLoading(container);

  const query = buildQuery(info.title);
  fetchPriceIndex(query).then((data) => {
    if (data && data.medianPrice !== null && data.count > 0) {
      renderOverlay(container, data, info);
    } else {
      renderCollapsed(container, info);
    }
  }).catch(() => {
    renderCollapsed(container, info);
  });
})();

function extractListingInfo() {
  const host = window.location.hostname;
  const info = { title: '', price: '', source: '' };

  if (host.includes('ebay.com')) {
    info.source = 'ebay';
    info.title = getText('h1.x-item-title__mainTitle span') ||
                 getText('h1[itemprop="name"]') ||
                 getText('h1');
    info.price = getText('[itemprop="price"]') ||
                 getText('.x-price-primary span') ||
                 getText('#prcIsum');
  } else if (host.includes('grailed.com')) {
    info.source = 'grailed';
    info.title = getText('[class*="ListingTitle"]') ||
                 getText('h1');
    info.price = getText('[class*="Price"]') ||
                 getText('[data-testid="listing-price"]');
  } else if (host.includes('depop.com')) {
    info.source = 'depop';
    info.title = getText('[data-testid="product__title"]') ||
                 getText('h1');
    info.price = getText('[data-testid="product__price"]') ||
                 getText('[aria-label*="price"]');
  } else if (host.includes('poshmark.com')) {
    info.source = 'poshmark';
    info.title = getText('[data-test="listing-title"]') ||
                 getText('h1');
    info.price = getText('[data-test="listing-price"]') ||
                 getText('.listing__ipad-price');
  }

  return info;
}

function getText(selector) {
  const el = document.querySelector(selector);
  return el ? el.textContent.trim() : '';
}

function buildQuery(title) {
  const stopWords = new Set([
    'vintage', 'rare', 'authentic', 'genuine', 'new', 'nwt', 'used', 'pre-owned',
    'size', 'sz', 'mens', 'womens', 'unisex', 'free', 'shipping',
    'a', 'an', 'the', 'and', 'or', 'for', 'in', 'on', 'with', 'of',
  ]);

  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w))
    .slice(0, 5)
    .join(' ');
}

async function fetchPriceIndex(query) {
  const url = `${NAYA_API}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}

function renderLoading(container) {
  container.innerHTML = `
    <div class="naya-card">
      <div class="naya-header">
        <span class="naya-logo">naya</span>
        <button class="naya-close" id="naya-close">&times;</button>
      </div>
      <div class="naya-loading">checking prices across platforms...</div>
    </div>
  `;
  container.querySelector('#naya-close').addEventListener('click', () => {
    container.remove();
  });
}

function renderOverlay(container, data, info) {
  const trend = data.trend30d;
  const trendClass = trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat';
  const trendText = trend !== null ? `${trend > 0 ? '+' : ''}${trend}%` : '—';

  let platformsHtml = '';
  if (data.byPlatform && Object.keys(data.byPlatform).length > 0) {
    const pills = Object.entries(data.byPlatform)
      .slice(0, 4)
      .map(([name, stats]) => `
        <div class="naya-platform-pill">
          <div class="naya-platform-name">${name}</div>
          <div class="naya-platform-price">$${Math.round(stats.median)}</div>
          <div class="naya-platform-count">${stats.count} listings</div>
        </div>
      `).join('');
    platformsHtml = `
      <div class="naya-section-label">by platform</div>
      <div class="naya-platforms">${pills}</div>
    `;
  }

  container.innerHTML = `
    <div class="naya-card">
      <div class="naya-header">
        <span class="naya-logo">naya</span>
        <button class="naya-close" id="naya-close">&times;</button>
      </div>
      <div class="naya-body">
        <div class="naya-section-label">median resale price</div>
        <div class="naya-price-row">
          <span class="naya-median">$${Math.round(data.medianPrice)}</span>
          <span class="naya-trend ${trendClass}">${trendText} <span style="font-size:10px;color:rgba(0,0,0,0.25)">30d</span></span>
        </div>
        ${data.priceRange ? `<div class="naya-range">Range: $${Math.round(data.priceRange.min)} — $${Math.round(data.priceRange.max)} across ${data.count} listings</div>` : ''}
        ${platformsHtml}
        <a href="https://www.nayaeditorial.shop/?q=${encodeURIComponent(buildQuery(info.title))}" target="_blank" class="naya-cta">
          search on naya
        </a>
      </div>
    </div>
  `;

  container.querySelector('#naya-close').addEventListener('click', () => {
    container.remove();
  });
}

function renderCollapsed(container, info) {
  container.innerHTML = `
    <a href="https://www.nayaeditorial.shop/?q=${encodeURIComponent(buildQuery(info.title))}" target="_blank" class="naya-badge-btn">
      <span class="naya-logo">naya</span>
      <span style="color:rgba(0,0,0,0.4);font-size:11px;">compare prices</span>
    </a>
  `;
}
