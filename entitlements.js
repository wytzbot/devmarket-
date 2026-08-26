import { db, requireProfile, json, safeError } from "./_lib/server.js";

async function download(req, res, profile) {
  const orderId = req.query?.orderId;
  if (!orderId) return json(res, 400, { error: "ORDER_REQUIRED" });

  const { data: o } = await db.from("orders").select("id,buyer_id,product_id,status").eq("id", orderId).single();
  if (!o || o.buyer_id !== profile.id || o.status !== "paid") return json(res, 403, { error: "DOWNLOAD_NOT_AUTHORIZED" });

  const { data: l } = await db.from("licenses").select("id,status,expires_at").eq("order_id", o.id).single();
  if (!l || l.status === "revoked" || (l.expires_at && new Date(l.expires_at) < new Date())) return json(res, 403, { error: "LICENSE_REQUIRED" });

  const { data: f } = await db.from("product_files").select("id,storage_path,version")
    .eq("product_id", o.product_id).eq("scan_status", "clean").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!f?.storage_path) return json(res, 404, { error: "FILE_NOT_AVAILABLE" });

  const { data: s, error } = await db.storage.from("product-source").createSignedUrl(f.storage_path, 600);
  if (error) throw error;

  await db.from("downloads").insert({ order_id: o.id, buyer_id: profile.id, product_id: o.product_id, version: f.version });
  return json(res, 200, { url: s.signedUrl, expiresIn: 600 });
}

// This check is intentionally public (no auth) — it's meant to let anyone
// paste a license key and confirm it's genuine, the same way a license page
// on any marketplace works.
async function verifyLicense(req, res) {
  const key = String(req.query?.key || "").trim();
  if (!key) return res.status(400).json({ valid: false, message: "License key is required." });
  const { data: l } = await db.from("licenses").select("license_key,status,license_type,issued_at,expires_at,product_id").eq("license_key", key).maybeSingle();
  if (!l) return res.json({ valid: false, message: "License not found." });
  const expired = l.expires_at && new Date(l.expires_at) < new Date();
  res.json({ valid: l.status !== "revoked" && !expired, message: expired ? "License expired." : "License is valid.", license: { type: l.license_type, issued_at: l.issued_at, status: l.status } });
}

// GET /api/entitlements?action=download&orderId=<id>  -> signed download URL (auth required)
// GET /api/entitlements?action=verify&key=<license>    -> public license check
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  try {
    if (req.query?.action === "verify") return await verifyLicense(req, res);
    const { profile } = await requireProfile(req);
    return await download(req, res, profile);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.statusCode ? safeError(e) : "REQUEST_FAILED" });
  }
}
