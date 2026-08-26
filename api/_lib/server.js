import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { verifyFirebaseToken } from '../lib/firebase-admin.js';

export const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Verifies the Firebase ID token on the request and returns the decoded token.
export async function requireUser(req) {
  try {
    return await verifyFirebaseToken(req);
  } catch (e) {
    const err = new Error(e.status === 401 ? 'UNAUTHORIZED' : (e.message || 'UNAUTHORIZED'));
    err.statusCode = e.status || 401;
    throw err;
  }
}

// Finds the caller's row in `profiles` (the app's single user table, per
// supabase/schema.sql), creating one on first sign-in. profiles.id has no
// DB default, so we generate it here.
export async function requireProfile(req) {
  const token = await requireUser(req);
  let { data: profile, error } = await db.from('profiles').select('*').eq('firebase_uid', token.uid).maybeSingle();
  if (error) throw error;
  if (!profile) {
    const insert = await db.from('profiles').insert({
      id: crypto.randomUUID(),
      firebase_uid: token.uid,
      username: (token.email || token.uid).split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || token.uid.slice(0, 12),
      display_name: token.name || token.email || null,
      role: 'buyer'
    }).select('*').single();
    if (insert.error) throw insert.error;
    profile = insert.data;
  }
  return { token, profile };
}

export async function json(res, status, body) { res.status(status).json(body); }
export function method(req, expected) { if (req.method !== expected) { const e = new Error('METHOD_NOT_ALLOWED'); e.statusCode = 405; throw e; } }
export function centsFromNgn(value) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw new Error('INVALID_AMOUNT'); return Math.round(n * 100); }
export function safeError(error) { console.error(error); return error?.message && /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'REQUEST_FAILED'; }
