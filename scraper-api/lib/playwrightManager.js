const { chromium } = require('playwright');

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-blink-features=AutomationControlled',
];

class PlaywrightManager {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.browsers = new Array(maxConcurrent).fill(null);
    this.available = [];
    this.queue = [];
    this._initPromise = null;
  }

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    const launches = this.browsers.map((_, i) =>
      chromium.launch({ headless: true, args: LAUNCH_ARGS, timeout: 60000 })
        .then((browser) => {
          this.browsers[i] = browser;
          this.available.push(i);
          browser.on('disconnected', () => this._handleDisconnect(i));
          console.log(`[pool] browser ${i} launched`);
        })
        .catch((err) => {
          console.error(`[pool] browser ${i} failed: ${err.message}`);
        })
    );
    await Promise.all(launches);
    const ready = this.browsers.filter(Boolean).length;
    console.log(`[pool] ${ready}/${this.maxConcurrent} persistent browsers ready`);
    this._drain();
  }

  _handleDisconnect(idx) {
    console.warn(`[pool] browser ${idx} disconnected, replacing...`);
    this.browsers[idx] = null;
    chromium.launch({ headless: true, args: LAUNCH_ARGS, timeout: 60000 })
      .then((browser) => {
        this.browsers[idx] = browser;
        this.available.push(idx);
        browser.on('disconnected', () => this._handleDisconnect(idx));
        console.log(`[pool] browser ${idx} replaced`);
        this._drain();
      })
      .catch((err) => {
        console.error(`[pool] failed to replace browser ${idx}: ${err.message}`);
      });
  }

  _drain() {
    while (this.queue.length > 0 && this.available.length > 0) {
      const idx = this.available.shift();
      if (!this.browsers[idx]) {
        continue;
      }
      const { resolve } = this.queue.shift();
      resolve(idx);
    }
  }

  async acquireBrowser() {
    await this.init();

    if (this.available.length > 0) {
      const idx = this.available.shift();
      if (this.browsers[idx]) return idx;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const queueIdx = this.queue.findIndex((e) => e.resolve === resolve);
        if (queueIdx !== -1) this.queue.splice(queueIdx, 1);
        reject(new Error('Timed out waiting for browser'));
      }, 30000);
      this.queue.push({
        resolve: (idx) => { clearTimeout(timeout); resolve(idx); },
      });
    });
  }

  releaseBrowser(idx) {
    if (idx != null && idx >= 0 && idx < this.browsers.length) {
      this.available.push(idx);
      this._drain();
    }
  }

  async createBrowser() {
    try {
      const idx = await this.acquireBrowser();
      const browser = this.browsers[idx];
      if (!browser) throw new Error('Browser slot empty');
      browser.__poolIdx = idx;
      return browser;
    } catch (err) {
      console.warn(`[pool] pool acquire failed (${err.message}), launching fresh browser`);
      const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS, timeout: 60000 });
      browser.__poolIdx = -1;
      return browser;
    }
  }

  async closeBrowser(browser) {
    if (!browser) return;
    try {
      const contexts = browser.contexts();
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    } catch {}

    const idx = browser.__poolIdx;
    if (typeof idx === 'number' && idx >= 0) {
      this.releaseBrowser(idx);
    } else {
      await browser.close().catch(() => {});
    }
  }
}

const playwrightManager = new PlaywrightManager(1);

module.exports = { playwrightManager };
