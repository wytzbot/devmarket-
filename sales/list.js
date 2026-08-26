import { db, requireProfile, safeError } from "../_lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  try {
    const { profile } = await requireProfile(req);
    const { data, error } = await db.from("orders")
      .select("*,products(id,name,slug)")
      .eq("developer_id", profile.id).order("created_at", { ascending: false });
    if (error) throw error;
    return res.status(200).json({ ok: true, sales: data || [] });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: safeError(e) });
  }
}
