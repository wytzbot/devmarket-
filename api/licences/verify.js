import { db } from "../_lib/server.js";
export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"METHOD_NOT_ALLOWED"});
  const key=String(req.query?.key||"").trim();
  if(!key) return res.status(400).json({valid:false,message:"License key is required."});
  try{
    const {data:l}=await db.from("licenses").select("license_key,status,license_type,issued_at,expires_at,product_id").eq("license_key",key).maybeSingle();
    if(!l) return res.json({valid:false,message:"License not found."});
    const expired=l.expires_at && new Date(l.expires_at)<new Date();
    res.json({valid:l.status!=="revoked"&&!expired,message:expired?"License expired.":"License is valid.",license:{type:l.license_type,issued_at:l.issued_at,status:l.status}});
  }catch(e){res.status(500).json({valid:false,message:"Unable to verify license."})}
}
