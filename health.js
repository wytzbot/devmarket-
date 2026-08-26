export default async function handler(req, res) {
  if (req.query?.check !== "db") {
    return res.status(200).json({ ok: true, service: "devmarket", timestamp: new Date().toISOString() });
  }
  try {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return res.status(500).json({ ok: false, code: "DB_ENV_MISSING" });
    const r = await fetch(`${url}/rest/v1/products?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) return res.status(500).json({ ok: false, code: "DB_QUERY_FAILED" });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("db-health", e);
    return res.status(500).json({ ok: false, code: "DB_HEALTH_FAILED" });
  }
}
