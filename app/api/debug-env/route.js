export async function GET() {
  const backendUrl = process.env.SCRAPER_BACKEND_URL?.trim();
  const result = {
    scraper_backend_url_set: !!backendUrl,
    scraper_backend_url_value: backendUrl
      ? backendUrl.slice(0, 20) + '...'
      : 'NOT SET',
  };

  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      result.backend_health = data;
      result.backend_reachable = true;
    } catch (err) {
      result.backend_reachable = false;
      result.backend_error = err.message;
    }
  }

  return Response.json(result);
}
