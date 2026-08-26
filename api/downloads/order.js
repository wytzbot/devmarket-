import { db, requireProfile, json, method, safeError } from "../_lib/server.js";

export default async function handler(req, res) {
  try {
    method(req, "GET");
    const { profile } = await requireProfile(req);
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
  } catch (e) {
    return json(res, e.statusCode || 500, { error: safeError(e) });
  }
}
