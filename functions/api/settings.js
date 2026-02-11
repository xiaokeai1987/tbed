export async function onRequestGet({ env }) {
  let allow = true;
  if (env?.kv) {
    const v = await env.kv.get("settings:allow_upload");
    if (v !== null && v !== undefined) {
      allow = v === "1" || v === "true";
    }
  }
  return new Response(JSON.stringify({ allow_upload: allow }), { headers: { "Content-Type": "application/json" } });
}
