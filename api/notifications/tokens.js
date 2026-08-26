import { db, requireProfile } from "../_lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  try {
    const { profile } = await requireProfile(req);
    const { token, platform = "web" } = req.body || {};
    if (typeof token !== "string" || token.length < 20 || token.length > 4096) {
      return res.status(400).json({ error: "INVALID_FCM_TOKEN" });
    }
    const { error } = await db.from("notification_tokens").upsert({
      user_id: profile.id,
      token,
      platform,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,token" });
    if (error) throw error;
    return res.json({ ok: true });
  } catch (error) {
    console.error("FCM_TOKEN_REGISTER_ERROR", error);
    return res.status(error.statusCode || 500).json({ error: error.statusCode === 401 ? "UNAUTHORIZED" : "TOKEN_REGISTRATION_FAILED" });
  }
}
