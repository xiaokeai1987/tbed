export async function onRequestGet({ request, env }) {
  const auth = request.headers.get("Authorization") || "";
  const pass = env.PASSWORD || "";
  if (!pass || !auth.startsWith("Bearer ") || auth.slice(7) !== pass) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  if (env?.db) {
    let { results } = await env.db.prepare("SELECT id, url, ts, likes FROM images ORDER BY ts DESC").all();
    const mapExt = (u) => {
      try {
        const p = new URL(u).pathname.split("/").pop() || "";
        const e = p.includes(".") ? p.split(".").pop().toLowerCase() : "";
        return ["jpg", "jpeg", "png", "webp", "gif"].includes(e) ? (e === "jpeg" ? "jpg" : e) : "jpg";
      } catch { return "jpg"; }
    };
    results = (results || []).map(r => ({ ...r, url: `/api/i/${r.id}`, ext: mapExt(r.url || "") }));
    if (env?.kv && results.length) {
      const metas = await Promise.all(results.map(r => env.kv.get(`image_meta:${r.id}`).then(v => (v ? JSON.parse(v) : null)).catch(() => null)));
      results = results.map((r, i) => ({ ...r, ip: metas[i]?.ip || "" }));
    }
    return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
  }
  if (env?.kv) {
    const list = await env.kv.list({ prefix: "image:" });
    const keys = list.keys || [];
    const records = await Promise.all(keys.map(k => env.kv.get(k.name).then(v => (v ? JSON.parse(v) : null))));
    const items = records
      .filter(Boolean)
      .sort((a, b) => b.ts - a.ts)
      .map(r => {
        let ext = "jpg";
        try {
          const p = new URL(r.url || "").pathname.split("/").pop() || "";
          const e = p.includes(".") ? p.split(".").pop().toLowerCase() : "";
          ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(e) ? (e === "jpeg" ? "jpg" : e) : "jpg";
        } catch {}
        return { ...r, url: `/api/i/${r.id}`, ext };
      });
    const filled = await Promise.all(items.map(async r => {
      if (!r.ip) {
        const m = await env.kv.get(`image_meta:${r.id}`);
        if (m) {
          try { const j = JSON.parse(m); r.ip = j?.ip || ""; } catch {}
        }
      }
      return r;
    }));
    return new Response(JSON.stringify(filled), { headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
}
