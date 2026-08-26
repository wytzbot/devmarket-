import { db, requireProfile, json, method, safeError, centsFromNgn } from "../_lib/server.js";

export default async function handler(req, res) {
  try {
    method(req, "POST");
    const { token, profile: buyer } = await requireProfile(req);
    const { productId } = req.body || {};
    if (!productId) return json(res, 400, { error: "PRODUCT_REQUIRED" });

    const { data: p } = await db.from("products")
      .select("id,name,price,currency,license_type,developer_id,status")
      .eq("id", productId).eq("status", "published").single();
    if (!p || p.currency !== "NGN") return json(res, 404, { error: "PRODUCT_UNAVAILABLE" });

    const { data: dev } = await db.from("profiles").select("id,paystack_subaccount").eq("id", p.developer_id).single();
    if (!dev?.paystack_subaccount) return json(res, 409, { error: "DEVELOPER_PAYMENT_ACCOUNT_NOT_CONFIGURED" });

    const amount = centsFromNgn(p.price), commission = Math.round(amount * 0.10);
    const { data: o, error } = await db.from("orders").insert({
      buyer_id: buyer.id, product_id: p.id, developer_id: dev.id,
      amount: Number(p.price), currency: "NGN", payment_provider: "paystack", status: "pending"
    }).select("id").single();
    if (error) throw error;

    const reference = `dm_${o.id}_${Date.now()}`;
    await db.from("orders").update({ payment_id: reference }).eq("id", o.id);

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: token.email || `${buyer.id}@buyers.devmarket`,
        amount, currency: "NGN", reference, subaccount: dev.paystack_subaccount,
        transaction_charge: commission,
        metadata: { order_id: o.id, product_id: p.id, buyer_id: buyer.id },
        callback_url: process.env.PAYSTACK_CALLBACK_URL || undefined
      })
    });
    const data = await response.json();
    if (!response.ok || !data.status) throw new Error("PAYSTACK_INITIALIZE_FAILED");
    return json(res, 200, { authorization_url: data.data.authorization_url, reference, orderId: o.id });
  } catch (e) {
    return json(res, e.statusCode || 500, { error: safeError(e) });
  }
}
