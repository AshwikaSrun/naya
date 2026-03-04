export const maxDuration = 60;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const testQuery = searchParams.get('q') || 'jacket';

  const backendUrl = process.env.SCRAPER_BACKEND_URL?.trim();
  const result = {
    scraper_backend_url_set: !!backendUrl,
    scraper_backend_url_value: backendUrl
      ? backendUrl.slice(0, 40) + '...'
      : 'NOT SET',
    timestamp: new Date().toISOString(),
  };

  if (!backendUrl) {
    return Response.json(result);
  }

  // Test health
  try {
    const healthRes = await fetch(`${backendUrl.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(10000),
    });
    result.backend_health = await healthRes.json();
    result.backend_reachable = true;
  } catch (err) {
    result.backend_reachable = false;
    result.backend_error = err.message;
    return Response.json(result);
  }

  // Test full proxy search (same as search route does)
  try {
    const searchUrl = `${backendUrl.replace(/\/$/, '')}/search?q=${encodeURIComponent(testQuery)}&limit=3&platform=all`;
    result.full_search_url = searchUrl;
    const start = Date.now();
    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(50000),
    });
    const searchData = await searchRes.json();
    result.full_search_elapsed_ms = Date.now() - start;
    result.full_search_status = searchRes.status;
    result.full_search_counts = {};
    for (const [key, val] of Object.entries(searchData?.results || {})) {
      result.full_search_counts[key] = Array.isArray(val) ? val.length : 0;
    }
    result.full_search_has_meta = !!searchData?.meta;
    result.full_search_works = true;
  } catch (err) {
    result.full_search_works = false;
    result.full_search_error = err.message;
  }

  return Response.json(result);
}
