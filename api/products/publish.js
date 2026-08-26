import { db, requireProfile, json, method, safeError } from '../_lib/server.js';

export default async function handler(req, res) {
  try {
    method(req, 'POST');
    const { profile } = await requireProfile(req);
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
  } catch (e) {
    return json(res, e.statusCode || 500, { error: safeError(e) });
  }
}
