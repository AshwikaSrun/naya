const IS_CONTAINER = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

// Single-process saves RAM on ~512MB instances but is unstable for back-to-back Playwright
// (Depop then eBay) — often triggers "browser has been closed" on page.content().
// Default: multi-process in containers. Set PLAYWRIGHT_SINGLE_PROCESS=1 if you OOM on tiny Railway.
const useSingleProcess =
  IS_CONTAINER &&
  (process.env.PLAYWRIGHT_SINGLE_PROCESS === '1' ||
    process.env.PLAYWRIGHT_SINGLE_PROCESS === 'true');

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-blink-features=AutomationControlled',
  ...(useSingleProcess ? ['--no-zygote', '--single-process'] : []),
];

module.exports = { LAUNCH_ARGS };
