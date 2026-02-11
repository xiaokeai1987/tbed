export async function onRequestGet({ request, env }) {
  const auth = request.headers.get("Authorization") || "";
  const pass = env.PASSWORD || "";
  if (!pass || !auth.startsWith("Bearer ") || auth.slice(7) !== pass) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  try {
    const u = new URL(request.url);
    const ip = (u.searchParams.get("ip") || "").trim();
    if (!ip) {
      return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    let loc = "";
    // Provider 1: ipapi.co (HTTPS, free tier)
    try {
      const r1 = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { headers: { "Accept": "application/json" } });
      if (r1.ok) {
        const j1 = await r1.json().catch(() => null);
        if (j1) {
          const country = j1.country_name || "";
          const region = j1.region || j1.region_code || "";
          const city = j1.city || "";
          loc = [country, region, city].filter(Boolean).join(" · ");
        }
      }
    } catch {}
    // Fallback: ip-api.com (HTTP free; may not support HTTPS on free plan)
    if (!loc) {
      try {
        const r2 = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?lang=zh-CN`, { headers: { "Accept": "application/json" } });
        if (r2.ok) {
          const j2 = await r2.json().catch(() => null);
          if (j2 && j2.status === "success") {
            const country = j2.country || "";
            const region = j2.regionName || "";
            const city = j2.city || "";
            loc = [country, region, city].filter(Boolean).join(" · ");
          }
        }
      } catch {}
    }
    return new Response(JSON.stringify({ ip, location: loc || ip }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
