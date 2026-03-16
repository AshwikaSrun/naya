const { chromium } = require('playwright');

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-zygote',
  '--single-process',
];

class PlaywrightManager {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.browsers = [];         // persistent browser instances
    this.available = [];        // indexes into this.browsers that are free
    this.queue = [];            // waiters for a free browser
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    const launches = [];
    for (let i = 0; i < this.maxConcurrent; i++) {
      launches.push(
        chromium.launch({ headless: true, args: LAUNCH_ARGS, timeout: 60000 })
          .then((browser) => {
            this.browsers.push(browser);
            this.available.push(this.browsers.length - 1);
            browser.on('disconnected', () => this._handleDisconnect(i));
          })
          .catch((err) => {
            console.error(`[pool] failed to launch browser ${i}:`, err.message);
          })
      );
    }
    await Promise.all(launches);
    console.log(`[pool] ${this.browsers.length} persistent browsers ready`);
  }

  _handleDisconnect(idx) {
    console.warn(`[pool] browser ${idx} disconnected, replacing...`);
    chromium.launch({ headless: true, args: LAUNCH_ARGS, timeout: 60000 })
      .then((browser) => {
        this.browsers[idx] = browser;
        this.available.push(idx);
        browser.on('disconnected', () => this._handleDisconnect(idx));
        this._drain();
      })
      .catch((err) => {
        console.error(`[pool] failed to replace browser ${idx}:`, err.message);
      });
  }

  _drain() {
    while (this.queue.length > 0 && this.available.length > 0) {
      const idx = this.available.shift();
      const resolve = this.queue.shift();
      resolve(idx);
    }
  }

  async acquireBrowser() {
    await this.init();
    if (this.available.length > 0) {
      const idx = this.available.shift();
      return idx;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  releaseBrowser(idx) {
    this.available.push(idx);
    this._drain();
  }

  async getPage(idx) {
    const browser = this.browsers[idx];
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });
    return context.newPage();
  }

  async withPage(fn) {
    const idx = await this.acquireBrowser();
    try {
      const page = await this.getPage(idx);
      try {
        return await fn(page);
      } finally {
        await page.context().close().catch(() => {});
      }
    } finally {
      this.releaseBrowser(idx);
    }
  }

  // Legacy API — kept so old scraper code still works during transition
  async createBrowser() {
    const idx = await this.acquireBrowser();
    const browser = this.browsers[idx];
    browser.__poolIdx = idx;
    return browser;
  }

  async closeBrowser(browser) {
    if (browser && typeof browser.__poolIdx === 'number') {
      // Close all contexts (pages) but keep the browser alive
      const contexts = browser.contexts();
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
      this.releaseBrowser(browser.__poolIdx);
    }
  }
}

const playwrightManager = new PlaywrightManager(3);

module.exports = { playwrightManager };
