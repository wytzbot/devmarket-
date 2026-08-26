import { getMessaging } from "firebase-admin/messaging";
import { getAdminApp } from "./_lib/firebase-admin.js";
import { db, requireProfile, safeError } from "./_lib/server.js";

async function list(req, res, profile) {
  const { data, error } = await db.from("notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  res.json({ notifications: data || [] });
}

async function markRead(req, res, profile) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "INVALID_REQUEST" });
  await db.from("notifications").update({ read: true }).eq("id", id).eq("user_id", profile.id);
  res.json({ ok: true });
}

async function registerToken(req, res, profile) {
  const { token, platform = "web" } = req.body || {};
  if (typeof token !== "string" || token.length < 20 || token.length > 4096) {
    return res.status(400).json({ error: "INVALID_FCM_TOKEN" });
  }
  const { error } = await db.from("notification_tokens").upsert(
    { user_id: profile.id, token, platform, updated_at: new Date().toISOString() },
    { onConflict: "user_id,token" }
  );
  if (error) throw error;
  res.json({ ok: true });
}

async function send(req, res, profile) {
  if (profile.role !== "admin") return res.status(403).json({ error: "FORBIDDEN" });
  const { userId, title, message, type = "system", url = "/notifications" } = req.body || {};
  if (!userId || !title || !message) return res.status(400).json({ error: "INVALID_REQUEST" });
  await db.from("notifications").insert({ user_id: userId, type, title, message });
  const { data: tokens } = await db.from("notification_tokens").select("token").eq("user_id", userId);
  if (tokens?.length) await getMessaging(getAdminApp()).sendEachForMulticast({ tokens: tokens.map(x => x.token), notification: { title, body: message }, data: { url } });
  res.json({ ok: true });
}

// GET  /api/notifications                  -> the caller's notifications
// POST /api/notifications?action=read      -> mark one notification read
// POST /api/notifications?action=tokens    -> register a push token
// POST /api/notifications?action=send      -> admin: push a notification to a user
export default async function handler(req, res) {
  try {
    const { profile } = await requireProfile(req);
    if (req.method === "GET") return await list(req, res, profile);
    if (req.method === "POST") {
      const action = req.query?.action;
      if (action === "read") return await markRead(req, res, profile);
      if (action === "tokens") return await registerToken(req, res, profile);
      if (action === "send") return await send(req, res, profile);
      return res.status(400).json({ error: "INVALID_ACTION" });
    }
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  } catch (e) {
    console.error(e);
    res.status(e.statusCode || 500).json({ error: safeError(e) });
  }
}
