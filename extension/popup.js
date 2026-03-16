document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
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
});

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
      <li class="wishlist-item" data-url="${escapeHtml(item.url)}">
        ${item.image ? `<img class="wl-img" src="${escapeHtml(item.image)}" alt="">` : '<div class="wl-img"></div>'}
        <div class="wl-info">
          <div class="wl-title">${escapeHtml(item.title || 'Untitled')}</div>
          <div class="wl-meta">${escapeHtml(item.source || '')} &middot; saved ${timeAgo(item.savedAt)}</div>
        </div>
        <div class="wl-price">${item.price ? '$' + Math.round(item.price) : ''}</div>
        <button class="wl-remove" data-remove="${escapeHtml(item.url)}" title="Remove">&times;</button>
      </li>
    `).join('');

    // Click to open
    list.querySelectorAll('.wishlist-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('wl-remove')) return;
        chrome.tabs.create({ url: el.dataset.url });
      });
    });

    // Remove buttons
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

function escapeHtml(str) {
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
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
