import { db, requireProfile, safeError } from "./_lib/server.js";

async function asBuyer(profile) {
  const { data, error } = await db.from("orders")
    .select("id,amount,currency,status,paid_at,created_at,product_id,licenses(license_key,license_type,status,issued_at)")
    .eq("buyer_id", profile.id).order("created_at", { ascending: false });
  if (error) throw error;
  const ids = (data || []).map(x => x.product_id);
  let products = [];
  if (ids.length) { const r = await db.from("products").select("id,name,slug,license_type").in("id", ids); products = r.data || []; }
  const map = new Map(products.map(p => [p.id, p]));
  return { orders: (data || []).map(o => ({ ...o, product: map.get(o.product_id) || null })) };
}

async function asDeveloper(profile) {
  const { data, error } = await db.from("orders").select("*,products(id,name,slug)").eq("developer_id", profile.id).order("created_at", { ascending: false });
  if (error) throw error;
  return { ok: true, sales: data || [] };
}

// GET /api/purchases             -> orders the caller has bought
// GET /api/purchases?role=sales  -> orders the caller has sold as a developer
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  try {
    const { profile } = await requireProfile(req);
    const body = req.query?.role === "sales" ? await asDeveloper(profile) : await asBuyer(profile);
    res.json(body);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: safeError(e) });
  }
}
