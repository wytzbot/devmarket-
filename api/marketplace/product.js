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
  const slug=String(req.query?.slug || new URL(req.url,"http://localhost").searchParams.get("slug") || "").trim();
  if(!slug) return res.status(400).json({ok:false,code:"SLUG_REQUIRED"});
  try {
    const p=await sb(`products?select=*&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`);
    if(!p.r.ok) return res.status(502).json({ok:false,code:"PRODUCT_QUERY_FAILED"});
    if(!p.data?.length) return res.status(404).json({ok:false,code:"PRODUCT_NOT_FOUND"});
    const product=p.data[0];
    const dev=await sb(`profiles?select=id,username,display_name,avatar_url,bio,github_username,github_connected,verified,created_at&id=eq.${product.developer_id}&limit=1`);
    return res.status(200).json({ok:true,product,developer:dev.data?.[0]||null});
  } catch(e) {
    console.error(e); return res.status(500).json({ok:false,code:"PRODUCT_FAILED"});
  }
}
