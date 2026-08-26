export async function getMarketplaceProducts(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== "") qs.set(k,String(v)); });
  const r = await fetch(`/api/marketplace/products?${qs}`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || data.code || "Unable to load products.");
  return data;
}

export async function getMarketplaceProduct(slug) {
  const r = await fetch(`/api/marketplace/product?slug=${encodeURIComponent(slug)}`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || data.code || "Product not found.");
  return data;
}

export async function getPurchases(idToken) {
  const r = await fetch("/api/purchases/list", { headers:{Authorization:`Bearer ${idToken}`} });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || data.code || "Unable to load purchases.");
  return data;
}

export async function getSales(idToken) {
  const r = await fetch("/api/sales/list", { headers:{Authorization:`Bearer ${idToken}`} });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || data.code || "Unable to load sales.");
  return data;
}
