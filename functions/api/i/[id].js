export async function onRequestGet({ request, env, params }) {
  const rawId = params?.id;
  const id = rawId ? String(rawId).replace(/\.[a-z0-9]+$/i, "") : "";
  if (!id) {
    return new Response("bad request", { status: 400 });
  }
  const u = new URL(request.url);
  const wParam = u.searchParams.get("w");
  const hParam = u.searchParams.get("h");
  const qParam = u.searchParams.get("q");
  const w = wParam ? Math.max(64, Math.min(2048, parseInt(wParam, 10) || 0)) : null;
  const h = hParam ? Math.max(64, Math.min(2048, parseInt(hParam, 10) || 0)) : null;
  const q = qParam ? Math.max(40, Math.min(90, parseInt(qParam, 10) || 0)) : 75;
  let url = "";
  if (env?.db) {
    const row = await env.db.prepare("SELECT url FROM images WHERE id = ?").bind(id).first();
    url = row?.url || "";
  }
  if (!url && env?.kv) {
    const v = await env.kv.get(`image:${id}`);
    url = v ? JSON.parse(v).url : "";
  }
  if (!url) {
    return new Response("not found", { status: 404 });
  }
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;
  const tryHosts = (u) => {
    const host = new URL(u).host;
    if (host === "telegra.ph") return ["https://telegra.ph", "https://te.legra.ph", "https://graph.org"];
    if (host === "te.legra.ph") return ["https://te.legra.ph", "https://graph.org", "https://telegra.ph"];
    if (host === "graph.org") return ["https://graph.org", "https://telegra.ph", "https://te.legra.ph"];
    return [new URL(u).origin];
  };
  const hosts = tryHosts(url);
  let res = null;
  for (const h of hosts) {
    const orig = new URL(url);
    const target = `${h}${orig.pathname}`;
    try {
      const cf = { cacheTtl: 86400, cacheEverything: true };
      if (w || h) {
        cf.image = { width: w || undefined, height: h || undefined, fit: "cover", quality: q };
      }
      const r = await fetch(target, { cf });
      if (r.ok) {
        res = r;
        break;
      }
    } catch {}
  }
  if (!res) {
    return new Response("upstream error", { status: 502 });
  }
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "public, max-age=86400, immutable");
  const out = new Response(res.body, { status: res.status, headers });
  await cache.put(request, out.clone());
  return out;
}
