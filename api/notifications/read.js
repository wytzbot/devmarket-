import { db, requireProfile, safeError } from "../_lib/server.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  try {
    const { profile } = await requireProfile(req);
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "INVALID_REQUEST" });
    await db.from("notifications").update({ read: true }).eq("id", id).eq("user_id", profile.id);
    res.json({ ok: true });
  } catch (e) { res.status(e.statusCode || 500).json({ error: safeError(e) }); }
}
