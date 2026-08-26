import { db, requireProfile, json, method, safeError } from './_lib/server.js';
import { cleanSlug, validLicense } from './_lib/validation.js';

async function createProduct(req, res, profile) {
  const { name, slug, description, category, technologies, price, currency = 'NGN', license, demoUrl } = req.body || {};
  const cleanedSlug = cleanSlug(slug);
  if (!name || !cleanedSlug || !description || !category || !validLicense(license) || currency !== 'NGN' || !(Number(price) > 0)) {
    return json(res, 400, { error: 'INVALID_PRODUCT' });
  }
  const r = await db.from('products').insert({
    developer_id: profile.id,
    name, slug: cleanedSlug, description, category,
    technologies: Array.isArray(technologies) ? technologies : [],
    price: Number(price), currency: 'NGN',
    license_type: license, demo_url: demoUrl || null,
    status: 'draft'
  }).select('*').single();
  if (r.error) {
    if (r.error.code === '23505') return json(res, 409, { error: 'SLUG_TAKEN' });
    throw r.error;
  }
  return json(res, 201, { product: r.data });
}

async function publishProduct(req, res, profile) {
  const { productId } = req.body || {};
  if (!productId) return json(res, 400, { error: 'PRODUCT_REQUIRED' });

  const { data: p } = await db.from('products').select('id,developer_id,status').eq('id', productId).single();
  if (!p) return json(res, 404, { error: 'NOT_FOUND' });
  if (p.developer_id !== profile.id) return json(res, 403, { error: 'FORBIDDEN' });

  const { data: f } = await db.from('product_files').select('scan_status')
    .eq('product_id', productId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!f || f.scan_status !== 'clean') return json(res, 409, { error: 'SCAN_NOT_CLEAN' });

  const r = await db.from('products').update({ status: 'published' }).eq('id', productId);
  if (r.error) throw r.error;
  return json(res, 200, { ok: true, status: 'published' });
}

// POST /api/products                  -> create a draft product
// POST /api/products?action=publish   -> publish a product (requires a clean file scan)
export default async function handler(req, res) {
  try {
    method(req, 'POST');
    const { profile } = await requireProfile(req);
    if (req.query?.action === 'publish') return await publishProduct(req, res, profile);
    return await createProduct(req, res, profile);
  } catch (e) {
    return json(res, e.statusCode || 500, { error: safeError(e) });
  }
}
