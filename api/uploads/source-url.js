import crypto from 'node:crypto';
import { db, requireProfile, json, method, safeError } from '../_lib/server.js';
import { validVersion } from '../lib/validation.js';

export default async function handler(req, res) {
  try {
    method(req, 'POST');
    const { profile } = await requireProfile(req);
    const { productId, version, fileName, fileSize, changelog } = req.body || {};
    if (!productId || !validVersion(version) || !fileName || !Number.isFinite(Number(fileSize)) ||
        Number(fileSize) > 250 * 1024 * 1024 || !String(fileName).toLowerCase().endsWith('.zip')) {
      return json(res, 400, { error: 'INVALID_UPLOAD' });
    }
    const { data: p } = await db.from('products').select('id,developer_id').eq('id', productId).single();
    if (!p) return json(res, 404, { error: 'NOT_FOUND' });
    if (p.developer_id !== profile.id) return json(res, 403, { error: 'FORBIDDEN' });

    const fileId = crypto.randomUUID();
    const path = `${productId}/${fileId}-${crypto.randomBytes(8).toString('hex')}.zip`;
    const { error: fe } = await db.from('product_files').insert({
      id: fileId, product_id: productId, version, storage_path: path,
      size_bytes: Number(fileSize), scan_status: 'pending', changelog: changelog || null
    });
    if (fe) throw fe;
    const { data: s, error } = await db.storage.from('product-source').createSignedUploadUrl(path);
    if (error) throw error;
    return json(res, 200, { path, token: s.token, fileId });
  } catch (e) {
    return json(res, e.statusCode || 500, { error: safeError(e) });
  }
}
