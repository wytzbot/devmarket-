import crypto from "node:crypto";
import { getMessaging } from "firebase-admin/messaging";
import { getAdminApp } from "../lib/firebase-admin.js";
import { db, json, method, safeError } from "../_lib/server.js";

function signature(raw,s){const secret=process.env.PAYSTACK_SECRET_KEY||process.env.PAYMENT_WEBHOOK_SECRET;if(!secret||!s)return false;const h=crypto.createHmac("sha512",secret).update(raw).digest("hex");return h.length===s.length&&crypto.timingSafeEqual(Buffer.from(h),Buffer.from(s))}
export default async function handler(req,res){
  try{
    method(req,"POST"); const raw=JSON.stringify(req.body||{});
    if(!signature(raw,req.headers["x-paystack-signature"])) return json(res,401,{error:"INVALID_SIGNATURE"});
    const e=req.body||{}, id=String(e.data?.id||e.data?.reference||""); if(!id)return json(res,400,{error:"EVENT_ID_REQUIRED"});
    const {data:old}=await db.from("webhook_events").select("processed").eq("provider","paystack").eq("event_id",id).maybeSingle();
    if(old?.processed)return json(res,200,{ok:true,duplicate:true});
    await db.from("webhook_events").upsert({provider:"paystack",event_id:id,event_type:e.event||"unknown",payload_hash:crypto.createHash("sha256").update(raw).digest("hex")},{onConflict:"provider,event_id"});
    if(e.event!=="charge.success")return json(res,200,{ok:true});
    const ref=String(e.data.reference);
    const vr=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,{headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`}});
    const vd=await vr.json(), tx=vd.data;
    if(!vd.status||!tx||tx.status!=="success"||tx.currency!=="NGN")return json(res,400,{error:"PAYMENT_NOT_VALID"});
    const orderId=tx.metadata?.order_id; const {data:o}=await db.from("orders").select("*").eq("id",orderId).single();
    if(!o)return json(res,404,{error:"ORDER_NOT_FOUND"});
    if(Math.round(Number(o.amount)*100)!==Number(tx.amount)||o.currency!=="NGN"||o.payment_id!==ref)return json(res,400,{error:"PAYMENT_MISMATCH"});
    if(o.status!=="paid"){
      await db.from("orders").update({status:"paid",paid_at:new Date().toISOString()}).eq("id",o.id);
      const {data:p}=await db.from("products").select("name,license_type").eq("id",o.product_id).single();
      const licenseKey=`WY-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
      await db.from("licenses").upsert({license_key:licenseKey,buyer_id:o.buyer_id,developer_id:o.developer_id,product_id:o.product_id,order_id:o.id,license_type:p?.license_type||"Commercial Use"},{onConflict:"order_id"});
      await db.from("notifications").insert({user_id:o.buyer_id,type:"purchase_success",title:"Purchase successful",message:`Your purchase of ${p?.name||"software"} is ready.`,product_id:o.product_id,order_id:o.id});
      const {data:tokens}=await db.from("notification_tokens").select("token").eq("user_id",o.buyer_id);
      if(tokens?.length){
        try{
          const app=getAdminApp(), messaging=getMessaging(app);
          await messaging.sendEachForMulticast({tokens:tokens.map(x=>x.token),notification:{title:"Purchase successful",body:`Your ${p?.name||"software"} purchase is ready.`},data:{orderId:o.id,url:"/purchases"}});
        }catch(pushErr){console.error("FCM_SEND_ERROR",pushErr)}
      }
    }
    await db.from("webhook_events").update({processed:true,processed_at:new Date().toISOString()}).eq("provider","paystack").eq("event_id",id);
    return json(res,200,{ok:true});
  }catch(e){console.error(e);return json(res,e.statusCode||500,{error:safeError(e)})}
}
