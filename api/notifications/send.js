import { getMessaging } from "firebase-admin/messaging";
import { getAdminApp } from "../lib/firebase-admin.js";
import { db, requireProfile, safeError } from "../_lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  try {
    const { profile } = await requireProfile(req);
    if (profile.role !== "admin") return res.status(403).json({ error: "FORBIDDEN" });
    const { userId, title, message, type = "system", url = "/notifications" } = req.body || {};
    if (!userId || !title || !message) return res.status(400).json({ error: "INVALID_REQUEST" });
    await db.from("notifications").insert({ user_id: userId, type, title, message });
    const { data: tokens } = await db.from("notification_tokens").select("token").eq("user_id", userId);
    if (tokens?.length) await getMessaging(getAdminApp()).sendEachForMulticast({ tokens: tokens.map(x => x.token), notification: { title, body: message }, data: { url } });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(e.statusCode || 500).json({ error: safeError(e) }); }
}
