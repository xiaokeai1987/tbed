export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const sort = url.searchParams.get("sort") || "latest"; // latest | hot
    const limitParam = parseInt(url.searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(50, limitParam)) : 20;
    const cursor = url.searchParams.get("cursor") || "";
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) return cached;

    // 优先使用 D1
    if (env?.db) {
      const order = sort === "hot" ? "likes DESC, ts DESC" : "ts DESC";
      let offset = 0;
      if (cursor && cursor.startsWith("d1:")) {
        const off = parseInt(cursor.slice(3), 10);
        if (Number.isFinite(off) && off >= 0) offset = off;
      }
      let { results } = await env.db
        .prepare(`SELECT id, url, ts, likes FROM images ORDER BY ${order} LIMIT ? OFFSET ?`)
        .bind(limit, offset)
        .all();
      const mapExt = (u) => {
        try {
          const p = new URL(u).pathname.split("/").pop() || "";
          const e = p.includes(".") ? p.split(".").pop().toLowerCase() : "";
          return ["jpg", "jpeg", "png", "webp", "gif"].includes(e) ? (e === "jpeg" ? "jpg" : e) : "jpg";
        } catch { return "jpg"; }
      };
      results = (results || []).map(r => {
        const ext = mapExt(r.url || "");
        return { ...r, url: `/api/i/${r.id}`, ext };
      });
      const next = results.length === limit ? `d1:${offset + results.length}` : "";
      const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "public, max-age=60" });
      if (next) headers.set("X-Next-Cursor", next);
      const res = new Response(JSON.stringify(results), { headers });
      await cache.put(request, res.clone());
      return res;
    }

    // 回退至 KV（仅本地或未绑定 D1 时）
    if (env?.kv) {
      const opts = { prefix: "image:", limit };
      if (cursor && cursor.startsWith("kv:")) {
        opts.cursor = cursor.slice(3);
      }
      const list = await env.kv.list(opts);
      const keys = list.keys || [];
      const records = await Promise.all(
        keys.map(k => env.kv.get(k.name).then(v => (v ? JSON.parse(v) : null)))
      );
      const mapExt = (u) => {
        try {
          const p = new URL(u).pathname.split("/").pop() || "";
          const e = p.includes(".") ? p.split(".").pop().toLowerCase() : "";
          return ["jpg", "jpeg", "png", "webp", "gif"].includes(e) ? (e === "jpeg" ? "jpg" : e) : "jpg";
        } catch { return "jpg"; }
      };
      const items = records.filter(Boolean).map(r => {
        const ext = mapExt(r.url || "");
        return { ...r, url: `/api/i/${r.id}`, ext };
      });

    if (sort === "hot") {
      items.sort((a, b) => {
        if (b.likes !== a.likes) return b.likes - a.likes;
        return b.ts - a.ts;
      });
    } else {
      items.sort((a, b) => b.ts - a.ts);
    }

      const nextCursor = list?.cursor && !list?.list_complete ? `kv:${list.cursor}` : "";
      const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "public, max-age=60" });
      if (nextCursor) headers.set("X-Next-Cursor", nextCursor);
      const res = new Response(JSON.stringify(items), { headers });
      await cache.put(request, res.clone());
      return res;
    }

    const res = new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" } });
    await cache.put(request, res.clone());
    return res;
  } catch (e) {
    return new Response(JSON.stringify({ error: "服务器错误" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
