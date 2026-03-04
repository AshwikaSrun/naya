// Playwright instance manager to limit concurrent browser instances
const { chromium } = require('playwright');

class PlaywrightManager {
  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
    this.activeInstances = 0;
    this.queue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.activeInstances < this.maxConcurrent) {
        this.activeInstances++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    this.activeInstances--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.activeInstances++;
      next();
    }
  }

  async createBrowser() {
    await this.acquire();
    try {
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process'
        ],
        timeout: 60000
      });
      return browser;
    } catch (err) {
      this.release();
      throw err;
    }
  }

  async closeBrowser(browser) {
    try {
      if (browser) {
        await browser.close();
      }
    } catch (err) {
      console.error('Error closing browser:', err);
    } finally {
      this.release();
    }
  }
}

// Singleton instance
const playwrightManager = new PlaywrightManager(3);

module.exports = { playwrightManager };
