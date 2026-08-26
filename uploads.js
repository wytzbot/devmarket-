import crypto from 'node:crypto';
import unzipper from 'unzipper';
import { db, requireProfile, json, method, safeError } from './_lib/server.js';
import { validVersion } from './_lib/validation.js';

const MAX_FILES = 20000, MAX_UNCOMPRESSED = 1024 * 1024 * 1024, MAX_ENTRY = 300 * 1024 * 1024, MAX_RATIO = 200, TEXT_LIMIT = 2 * 1024 * 1024;
const EXEC = /\.(exe|dll|scr|com|bat|cmd|ps1|vbs|vbe|jar|msi|hta|apk|dmg|iso)$/i;
const RULES = [/powershell\s+.*-enc(?:odedcommand)?/i, /eval\s*\(\s*atob\s*\(/i, /child_process\.(exec|spawn|execFile)/i, /os\.system\s*\(/i, /curl\s+https?:\/\//i, /wget\s+https?:\/\//i, /chmod\s+\+x/i];
function unsafePath(n) { n = n.replaceAll('\\', '/'); return n.startsWith('/') || n.split('/').includes('..') || n.startsWith('__MACOSX/'); }

async function clam(url) {
  if (!process.env.CLAMAV_SCANNER_URL) return { enabled: false };
  const r = await fetch(process.env.CLAMAV_SCANNER_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'x-scanner-secret': process.env.CLAMAV_SCANNER_SECRET || '' }, body: JSON.stringify({ url }) });
  if (!r.ok) throw new Error('CLAMAV_SCANNER_UNAVAILABLE');
  const j = await r.json();
  return { enabled: true, clean: j.clean === true, signature: j.signature || null };
}

async function scanBuffer(buf, signedUrl) {
  if (buf.slice(0, 2).toString() !== 'PK') return { status: 'quarantined', reason: 'NOT_A_ZIP' };
  const c = signedUrl ? await clam(signedUrl) : { enabled: false };
  if (c.enabled && !c.clean) return { status: 'infected', reason: 'CLAMAV_DETECTION', signature: c.signature };

  let files = 0, total = 0;
  const findings = [];
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  try {
    const zip = await unzipper.Open.buffer(buf);
    for (const e of zip.files) {
      if (++files > MAX_FILES) { findings.push('TOO_MANY_FILES'); break; }
      const n = e.path || '';
      if (unsafePath(n)) { findings.push('UNSAFE_PATH:' + n.slice(0, 160)); continue; }
      const u = Number(e.uncompressedSize || 0), q = Number(e.compressedSize || 0);
      total += u;
      if (u > MAX_ENTRY) findings.push('LARGE_ENTRY:' + n.slice(0, 120));
      if (q && u / q > MAX_RATIO) findings.push('COMPRESSION_BOMB_RATIO:' + n.slice(0, 120));
      if (total > MAX_UNCOMPRESSED) { findings.push('ARCHIVE_TOO_LARGE'); break; }
      if (EXEC.test(n)) findings.push('EXECUTABLE_OR_SCRIPT:' + n.slice(0, 150));
      if (e.type === 'File' && u <= TEXT_LIMIT) {
        const content = await e.buffer();
        const text = content.toString('utf8').replaceAll('\0', '');
        if (RULES.some(r => r.test(text))) findings.push('SUSPICIOUS_PATTERN:' + n.slice(0, 150));
      }
    }
  } catch (e) {
    return { status: 'failed', reason: 'ZIP_PARSE_ERROR:' + e.message };
  }
  return { status: findings.length ? 'quarantined' : 'clean', reason: findings.length ? 'STATIC_RULE_MATCH' : 'CLEAN', findings: findings.slice(0, 100), files, bytes: total, sha256: hash, clamav: c.enabled };
}

async function sourceUrl(req, res, profile) {
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
}

async function finalize(req, res, profile) {
  const { productId, fileId, path, fileSize } = req.body || {};
  if (!productId || !fileId || !path || Number(fileSize) > 250 * 1024 * 1024) return json(res, 400, { error: 'INVALID_UPLOAD' });

  const { data: p } = await db.from('products').select('developer_id').eq('id', productId).single();
  if (!p || p.developer_id !== profile.id) return json(res, 403, { error: 'FORBIDDEN' });

  await db.from('product_files').update({ scan_status: 'scanning' }).eq('id', fileId).eq('product_id', productId);

  const { data: blob, error: de } = await db.storage.from('product-source').download(path);
  if (de) throw de;
  const buf = Buffer.from(await blob.arrayBuffer());
  if (buf.length !== Number(fileSize)) {
    await db.from('product_files').update({ scan_status: 'failed', scan_report: { reason: 'SIZE_MISMATCH' } }).eq('id', fileId);
    return json(res, 400, { error: 'INVALID_ZIP' });
  }

  let scan;
  try {
    const { data: s } = await db.storage.from('product-source').createSignedUrl(path, 900);
    scan = await scanBuffer(buf, s?.signedUrl);
  } catch (e) {
    await db.from('product_files').update({ scan_status: 'failed', scan_report: { reason: e.message } }).eq('id', fileId);
    return json(res, 503, { error: 'SCAN_FAILED' });
  }

  await db.from('product_files').update({
    scan_status: scan.status, scan_report: scan, sha256: scan.sha256 || null, scanned_at: new Date().toISOString()
  }).eq('id', fileId);

  if (scan.status !== 'clean') return json(res, 409, { error: 'UPLOAD_QUARANTINED', scan });
  return json(res, 200, { ok: true, scan });
}

// POST /api/uploads?step=source-url  -> reserve a product_files row + signed upload URL
// POST /api/uploads?step=finalize    -> download, scan, and record the scan result
export default async function handler(req, res) {
  try {
    method(req, 'POST');
    const { profile } = await requireProfile(req);
    if (req.query?.step === 'finalize') return await finalize(req, res, profile);
    return await sourceUrl(req, res, profile);
  } catch (e) {
    return json(res, e.statusCode || 500, { error: safeError(e) });
  }
}
