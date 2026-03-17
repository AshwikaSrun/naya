const IS_CONTAINER = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-blink-features=AutomationControlled',
  // In Docker/Railway containers, single-process mode is needed to stay
  // within memory limits. On Windows dev machines these flags crash Chromium.
  ...(IS_CONTAINER ? ['--no-zygote', '--single-process'] : []),
];

module.exports = { LAUNCH_ARGS };
