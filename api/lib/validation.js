export const MAX_SOURCE_BYTES=250*1024*1024;
export const BUCKET='product-source';
export function cleanSlug(s){return String(s||'').trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)}
export function validLicense(x){return ['MIT','Apache 2.0','GPL','Personal Use','Commercial Use','Extended Commercial','Custom License'].includes(x)}
export function validVersion(x){return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(String(x||''))}
export function jsonError(res,status,error,message){return res.status(status).json({error,message})}
