import { db, requireProfile, json, method, safeError } from '../_lib/server.js';
import { cleanSlug, validLicense } from '../lib/validation.js';

export default async function handler(req, res) {
  try {
    method(req, 'POST');
    const { profile } = await requireProfile(req);
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
  } catch (e) {
    return json(res, e.statusCode || 500, { error: safeError(e) });
  }
}
