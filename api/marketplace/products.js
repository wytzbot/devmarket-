const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function configError(res) {
  return res.status(500).json({ ok:false, code:"DB_ENV_MISSING", message:"Database is not configured." });
}
async function sb(path, options={}) {
  const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { r, data };
}

export default async function handler(req,res) {
  if (!supabaseUrl || !serviceKey) return configError(res);
  try {
    const url = new URL(req.url, "http://localhost");
    const search = url.searchParams.get("search")?.trim() || "";
    const category = url.searchParams.get("category")?.trim() || "";
    const technology = url.searchParams.get("technology")?.trim() || "";
    const sort = url.searchParams.get("sort") || "new";
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") || 24)));
    const from = (page-1)*limit, to = from+limit-1;

    let qs = `select=id,name,slug,description,category,technologies,price,currency,license_type,demo_url,version,sales_count,rating,developer_id,created_at,updated_at&status=eq.published&order=updated_at.desc&offset=${from}&limit=${limit}`;
    if (category) qs += `&category=eq.${encodeURIComponent(category)}`;
    if (technology) qs += `&technologies=cs.{${encodeURIComponent(technology)}}`;
    if (search) {
      const q=encodeURIComponent(search);
      qs += `&or=(name.ilike.*${q}*,description.ilike.*${q}*)`;
    }
    if (sort==="price_low") qs=qs.replace("order=updated_at.desc","order=price.asc");
    if (sort==="price_high") qs=qs.replace("order=updated_at.desc","order=price.desc");
    if (sort==="rating") qs=qs.replace("order=updated_at.desc","order=rating.desc");
    if (sort==="sales") qs=qs.replace("order=updated_at.desc","order=sales_count.desc");

    const {r,data}=await sb(qs,{headers:{"Prefer":"count=exact","Range":`${from}-${to}`}});
    if(!r.ok) return res.status(502).json({ok:false,code:"PRODUCT_QUERY_FAILED"});
    return res.status(200).json({ok:true,products:data||[],page,limit});
  } catch(e) {
    console.error(e); return res.status(500).json({ok:false,code:"MARKETPLACE_FAILED"});
  }
}
