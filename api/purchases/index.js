import { db, requireProfile, safeError } from "../_lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  try {
    const { profile } = await requireProfile(req);
    const { data, error } = await db.from("orders")
      .select("id,amount,currency,status,paid_at,created_at,product_id,licenses(license_key,license_type,status,issued_at)")
      .eq("buyer_id", profile.id).order("created_at", { ascending: false });
    if (error) throw error;
    const ids = (data || []).map(x => x.product_id);
    let products = [];
    if (ids.length) { const r = await db.from("products").select("id,name,slug,license_type").in("id", ids); products = r.data || []; }
    const map = new Map(products.map(p => [p.id, p]));
    res.json({ orders: (data || []).map(o => ({ ...o, product: map.get(o.product_id) || null })) });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: safeError(e) });
  }
}
