export const maxDuration = 60;

export async function GET(request) {
  const backendUrl = process.env.SCRAPER_BACKEND_URL?.trim();
  const result = {
    scraper_backend_url_set: !!backendUrl,
    scraper_backend_url_value: backendUrl
      ? backendUrl.slice(0, 40) + '...'
      : 'NOT SET',
    timestamp: new Date().toISOString(),
  };

  if (backendUrl) {
    try {
      const healthRes = await fetch(`${backendUrl.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(10000),
      });
      result.backend_health = await healthRes.json();
      result.backend_reachable = true;
    } catch (err) {
      result.backend_reachable = false;
      result.backend_error = err.message;
    }

    try {
      const searchUrl = `${backendUrl.replace(/\/$/, '')}/search?q=test&limit=2&platform=ebay`;
      result.test_search_url = searchUrl;
      const start = Date.now();
      const searchRes = await fetch(searchUrl, {
        signal: AbortSignal.timeout(30000),
      });
      const searchData = await searchRes.json();
      result.test_search_elapsed_ms = Date.now() - start;
      result.test_search_status = searchRes.status;
      result.test_search_ebay_count = searchData?.results?.ebay?.length || 0;
      result.test_search_proxy_works = true;
    } catch (err) {
      result.test_search_proxy_works = false;
      result.test_search_error = err.message;
    }
  }

  return Response.json(result);
}
