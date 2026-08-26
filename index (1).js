import { db, requireProfile, safeError } from "../_lib/server.js";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  try {
    const { profile } = await requireProfile(req);
    const { data, error } = await db.from("notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    res.json({ notifications: data || [] });
  } catch (e) { res.status(e.statusCode || 500).json({ error: safeError(e) }); }
}
