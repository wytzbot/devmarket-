import React from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter, Routes, Route, Link, useParams, useNavigate,
  Navigate, useLocation
} from "react-router-dom";
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "./firebase";
import { api, money } from "./api";
import { enablePushNotifications, listenToPush } from "./fcm";
import { createClient } from "@supabase/supabase-js";
import { getMarketplaceProducts, getMarketplaceProduct } from "./services/marketplaceApi";
import ErrorBoundary from "./ErrorBoundary";
import "./styles.css";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder"
);

// Shown until (or unless) the marketplace API returns real published products,
// so Explore/Home/Product/Developer always have something to render.
const demoProducts = [
  {id:"demo-1",slug:"saas-launch-kit",name:"SaaS Launch Kit",price:49000,currency:"NGN",license:"Commercial Use",developer:"buildfast",rating:4.9,sales:128,category:"SaaS",tech:["React","Node.js","Supabase"],demo:"https://example.com",description:"A production-minded SaaS starter for developers who want to ship quickly."},
  {id:"demo-2",slug:"ai-api-starter",name:"AI API Starter",price:39000,currency:"NGN",license:"MIT",developer:"neuralworks",rating:4.8,sales:94,category:"AI",tech:["Node.js","AI","PostgreSQL"],description:"A clean foundation for shipping AI-powered APIs."},
  {id:"demo-3",slug:"mobile-ui-kit",name:"Mobile UI Kit",price:29000,currency:"NGN",license:"Commercial Use",developer:"pixelcraft",rating:4.9,sales:201,category:"UI Kits",tech:["React Native","UI"],description:"Premium mobile screens and components for rapid development."}
];

// Adapts a row from /api/marketplace (real schema columns) into the
// shape the UI components below expect (tech/license/developer/rating/sales).
function normalizeProduct(p) {
  return {
    id: p.id, slug: p.slug, name: p.name, description: p.description,
    price: p.price, currency: p.currency || "NGN",
    license: p.license_type || "Commercial Use",
    category: p.category, tech: Array.isArray(p.technologies) ? p.technologies : [],
    developer: p.developerUsername || p.developer_id || "developer",
    rating: p.rating || 0, sales: p.sales_count || 0, demo: p.demo_url || null
  };
}

// Loads real published products from the API; falls back to the demo array
// when the backend isn't configured yet or returns nothing.
function useProducts() {
  const [products, setProducts] = React.useState(demoProducts);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let cancelled = false;
    getMarketplaceProducts({ limit: 48 }).then(d => {
      if (cancelled) return;
      const real = (d.products || []).map(normalizeProduct);
      if (real.length) setProducts(real);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { products, loading };
}

function Layout({user,children}) {
  const [push,setPush]=React.useState(false);
  React.useEffect(()=>{
    let off=()=>{};
    if(user) listenToPush(()=>{}).then(fn=>off=fn).catch(()=>{});
    return ()=>off();
  },[user]);
  async function pushOn(){
    try{await enablePushNotifications();setPush(true)}catch(e){alert(e.message)}
  }
  return <div className="app">
    <header className="topbar">
      <Link className="logo" to="/">Dev<span>Market</span></Link>
      <nav>
        <Link to="/explore">Explore</Link>
        <Link to="/dashboard">Sell</Link>
        <Link to="/purchases">Purchases</Link>
        <Link to="/notifications">Notifications</Link>
      </nav>
      <div className="headerActions">
        {user ? <>
          <button className="iconBtn" title="Enable push notifications" onClick={pushOn}>{push?"🔔":"🔕"}</button>
          <Link className="avatarSmall" to="/settings">{(user.displayName||user.email||"U")[0].toUpperCase()}</Link>
          <button className="ghostBtn" onClick={()=>signOut(auth)}>Sign out</button>
        </> : <Link className="primaryBtn" to="/login">Sign in</Link>}
      </div>
    </header>
    {children}
    <footer><span>© 2026 DevMarket</span><span>Software-first marketplace · NGN MVP</span><Link to="/settings">Settings</Link></footer>
  </div>
}

function Auth() {
  const nav=useNavigate();
  React.useEffect(()=>{ getRedirectResult(auth).then(r=>{ if(r) nav("/dashboard") }).catch(e=>console.error(e)) },[]);
  async function login(provider){
    try{ await signInWithPopup(auth,provider); nav("/dashboard") }
    catch(e){
      // Mobile Chrome commonly blocks/kills the popup flow — fall back to a
      // full-page redirect instead of failing outright.
      if(["auth/popup-blocked","auth/popup-closed-by-user","auth/cancelled-popup-request","auth/operation-not-supported-in-this-environment"].includes(e.code)){
        try{ await signInWithRedirect(auth,provider); return } catch(e2){ alert(e2.message); return }
      }
      alert(e.message)
    }
  }
  return <main className="authPage"><div className="authCard">
    <div className="eyebrow">DEVMARKET</div><h1>Buy and sell real software.</h1>
    <p>One account for buying products, publishing your own software, licenses and protected downloads.</p>
    <button className="primaryBtn wide" onClick={()=>login(googleProvider)}>Continue with Google</button>
    <button className="secondaryBtn wide" onClick={()=>login(githubProvider)}>Continue with GitHub</button>
    <small>Authentication is handled by Firebase. Payment and download authorization remain server-side.</small>
  </div></main>
}

function Home(){
  const {products}=useProducts();
  return <main>
    <section className="hero">
      <div className="eyebrow">THE SOFTWARE-FIRST MARKETPLACE</div>
      <h1>Ship software.<br/><em>Get paid.</em></h1>
      <p>Production-ready source code, SaaS starters, APIs, UI kits and developer tools from independent developers.</p>
      <div className="heroActions"><Link className="primaryBtn big" to="/explore">Explore products →</Link><Link className="secondaryBtn big" to="/dashboard/products/new">Sell your software</Link></div>
      <div className="trustRow"><span>✓ Private source code</span><span>✓ Verified Paystack payments</span><span>✓ Temporary downloads</span></div>
    </section>
    <section className="section"><div className="sectionTitle"><div><div className="eyebrow">CURATED</div><h2>Build faster</h2></div><Link to="/explore">View all →</Link></div><div className="productGrid">{products.slice(0,3).map(p=><ProductCard key={p.slug} p={p}/>)}</div></section>
  </main>
}

function ProductCard({p}){
  return <Link className="productCard" to={"/product/"+p.slug}>
    <div className="productVisual"><span>{p.category==="AI"?"◈":p.category==="UI Kits"?"▦":"⚡"}</span><b>SOFTWARE</b></div>
    <div className="cardBody"><div className="rating">★★★★★ <span>{p.rating}</span></div><h3>{p.name}</h3><p>{p.description}</p><div className="chips">{p.tech.map(t=><span key={t}>{t}</span>)}</div><div className="cardFoot"><span>@{p.developer}</span><strong>{money(p.price)}</strong></div></div>
  </Link>
}

function Explore(){
  const {products}=useProducts();
  const [q,setQ]=React.useState(""); const [cat,setCat]=React.useState("All");
  const list=products.filter(p=>(cat==="All"||p.category===cat)&&(`${p.name} ${p.developer} ${p.tech.join(" ")}`.toLowerCase().includes(q.toLowerCase())));
  return <main className="page"><div className="eyebrow">MARKETPLACE</div><h1>Explore software</h1><p className="muted">Find production-ready building blocks without hunting through random repositories.</p>
    <div className="filterBar"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products, developers, technologies…"/><select value={cat} onChange={e=>setCat(e.target.value)}><option>All</option><option>SaaS</option><option>AI</option><option>UI Kits</option></select><select><option>Trending</option><option>New</option><option>Best rated</option><option>Price low to high</option></select></div>
    <div className="productGrid">{list.map(p=><ProductCard p={p} key={p.slug}/>)}</div>
  </main>
}

function Product(){
  const {slug}=useParams();
  const [p,setP]=React.useState(()=>demoProducts.find(x=>x.slug===slug)||demoProducts[0]);
  const [busy,setBusy]=React.useState(false);
  React.useEffect(()=>{
    let cancelled=false;
    getMarketplaceProduct(slug).then(d=>{
      if(cancelled||!d.product) return;
      const dev=normalizeProduct(d.product);
      dev.developer=d.developer?.username||dev.developer;
      setP(dev);
    }).catch(()=>{});
    return ()=>{cancelled=true};
  },[slug]);
  async function buy(){
    if(!auth.currentUser){alert("Sign in first.");return}
    if(p.id.startsWith("demo-")){alert("This demo product is UI-only. Publish a real product to enable live checkout.");return}
    try{setBusy(true);const d=await api("/api/payments/paystack",{method:"POST",body:JSON.stringify({productId:p.id})});window.location.href=d.authorization_url}
    catch(e){alert(e.message)}finally{setBusy(false)}
  }
  return <main className="page">
    <Link className="back" to="/explore">← Explore</Link>
    <div className="productDetail"><div className="detailVisual">◈<small>LIVE DEMO</small></div><div className="detailInfo">
      <div className="eyebrow">SOFTWARE PRODUCT</div><h1>{p.name}</h1><p className="lead">{p.description}</p>
      <div className="rating">★★★★★ {p.rating} · {p.sales} sales</div><div className="chips">{p.tech.map(t=><span key={t}>{t}</span>)}</div>
      <div className="priceBox"><strong>{money(p.price)}</strong><span>{p.license} · {p.currency}</span></div>
      <div className="heroActions"><button className="primaryBtn big" onClick={buy} disabled={busy}>{busy?"Opening Paystack…":"Purchase →"}</button>{p.demo&&<a className="secondaryBtn big" href={p.demo} target="_blank" rel="noreferrer">Live demo ↗</a>}</div>
      <div className="securityBox">🔒 Source ZIP stays private. Purchase authorization is based on a verified backend Paystack webhook—not browser payment state.</div>
    </div></div>
    <section className="detailTabs"><h2>Overview</h2><p>{p.description} Each purchase can receive a unique license and a short-lived signed download URL.</p><h2>License</h2><p>{p.license} — the developer's license terms remain authoritative.</p><h2>Developer</h2><Link to={"/developer/"+p.developer}>@{p.developer} →</Link></section>
  </main>
}

function Developer(){
  const {username}=useParams();
  const {products}=useProducts();
  const list=products.filter(p=>p.developer===username);
  return <main className="page"><div className="profileHead"><div className="profileAvatar">{username[0].toUpperCase()}</div><div><div className="eyebrow">DEVELOPER</div><h1>@{username}</h1><p className="muted">GitHub Connected · Trusted Seller</p></div></div><div className="stats"><div><b>4.9</b><span>rating</span></div><div><b>{list.length||3}</b><span>products</span></div><div><b>1,284</b><span>sales</span></div></div><div className="productGrid">{list.length?list.map(p=><ProductCard p={p} key={p.slug}/>):<p>No published products yet.</p>}</div></main>
}

function Protected({user,children}){return user?children:<Navigate to="/login" replace/>}

function NewProduct({user}){
  const nav=useNavigate(); const [busy,setBusy]=React.useState(false); const [status,setStatus]=React.useState("");
  const [f,setF]=React.useState({name:"",slug:"",description:"",category:"SaaS",technologies:"React, Node.js",price:"49000",license:"Commercial Use",demoUrl:"",version:"1.0.0",changelog:"Initial release"});
  const [file,setFile]=React.useState(null);
  const set=(e)=>setF({...f,[e.target.name]:e.target.value});
  async function submit(e){
    e.preventDefault(); if(!file?.name.toLowerCase().endsWith(".zip"))return alert("Choose a ZIP source archive.");
    if(file.size>250*1024*1024)return alert("Maximum ZIP size is 250 MB.");
    try{
      setBusy(true); const h={Authorization:"Bearer "+await user.getIdToken()};
      setStatus("Creating private draft…");
      const d=await api("/api/products",{method:"POST",headers:h,body:JSON.stringify({...f,technologies:f.technologies.split(",").map(x=>x.trim()).filter(Boolean),price:Number(f.price),currency:"NGN"})});
      setStatus("Preparing secure upload…");
      const prep=await api("/api/uploads?step=source-url",{method:"POST",headers:h,body:JSON.stringify({productId:d.product.id,version:f.version,fileName:file.name,fileSize:file.size,changelog:f.changelog})});
      setStatus("Uploading private source…");
      const up=await supabase.storage.from("product-source").uploadToSignedUrl(prep.path,prep.token,file); if(up.error)throw up.error;
      setStatus("Scanning ZIP…");
      const scan=await api("/api/uploads?step=finalize",{method:"POST",headers:h,body:JSON.stringify({productId:d.product.id,fileId:prep.fileId,path:prep.path,fileSize:file.size})});
      if(scan.scan?.status!=="clean")throw new Error("Upload quarantined by security validation.");
      setStatus("Publishing…");
      await api("/api/products?action=publish",{method:"POST",headers:h,body:JSON.stringify({productId:d.product.id})});
      setStatus("Published successfully."); nav("/dashboard");
    }catch(e){alert(e.message);setStatus("")}finally{setBusy(false)}
  }
  return <main className="page narrow"><div className="eyebrow">SELLER</div><h1>Publish software</h1><p className="muted">Your source archive goes directly into private storage and must pass validation before publishing.</p>
    <form className="form" onSubmit={submit}>
      <label>Name<input name="name" value={f.name} onChange={set} required/></label>
      <label>Slug<input name="slug" value={f.slug} onChange={set} placeholder="my-saas-starter" required/></label>
      <label>Description<textarea name="description" value={f.description} onChange={set} rows="5" required/></label>
      <div className="formGrid"><label>Category<select name="category" value={f.category} onChange={set}><option>SaaS</option><option>React</option><option>Node.js</option><option>AI</option><option>APIs</option><option>UI Kits</option><option>Templates</option><option>Developer Tools</option></select></label><label>Price (NGN)<input name="price" type="number" min="100" value={f.price} onChange={set} required/></label></div>
      <label>Technologies<input name="technologies" value={f.technologies} onChange={set}/></label>
      <label>License<select name="license" value={f.license} onChange={set}><option>MIT</option><option>Apache 2.0</option><option>GPL</option><option>Personal Use</option><option>Commercial Use</option><option>Extended Commercial</option><option>Custom License</option></select></label>
      <div className="formGrid"><label>Version<input name="version" value={f.version} onChange={set} pattern="\d+\.\d+\.\d+" required/></label><label>Demo URL<input name="demoUrl" value={f.demoUrl} onChange={set} placeholder="https://…"/></label></div>
      <label>Source ZIP<input type="file" accept=".zip,application/zip" onChange={e=>setFile(e.target.files?.[0]||null)} required/><small>ZIP only · 250 MB maximum</small></label>
      <label>Changelog<textarea name="changelog" value={f.changelog} onChange={set} rows="3"/></label>
      <button className="primaryBtn big" disabled={busy}>{busy?status:"Upload privately & publish"}</button>
    </form>
  </main>
}

function Dashboard({user}){
  return <main className="page"><div className="dashHead"><div><div className="eyebrow">SELLER WORKSPACE</div><h1>Your store</h1><p className="muted">{user.email}</p></div><Link className="primaryBtn" to="/dashboard/products/new">+ New product</Link></div>
    <div className="metrics"><div><span>Revenue</span><b>₦0</b></div><div><span>Sales</span><b>0</b></div><div><span>Products</span><b>0</b></div><div><span>Plan</span><b>Free</b></div></div>
    <div className="dashboardGrid"><section className="panel"><h2>Store checklist</h2><p>✓ Firebase authentication</p><p>✓ Private source storage</p><p>✓ ZIP security validation</p><p>✓ Verified Paystack webhook</p><p>✓ License + signed download architecture</p><p>✓ FCM notification layer</p></section><section className="panel"><h2>Manage</h2><Link className="rowLink" to="/dashboard/products">Products →</Link><Link className="rowLink" to="/dashboard/sales">Sales →</Link><Link className="rowLink" to="/dashboard/licenses">Licenses →</Link><Link className="rowLink" to="/dashboard/analytics">Analytics →</Link><Link className="rowLink" to="/dashboard/settings">Store settings →</Link></section></div>
  </main>
}

function Purchases(){
  const [items,setItems]=React.useState([]); const [err,setErr]=React.useState("");
  React.useEffect(()=>{api("/api/purchases").then(d=>setItems(d.orders||d.purchases||[])).catch(e=>setErr(e.message))},[]);
  return <main className="page"><div className="eyebrow">BUYER</div><h1>Purchases</h1>{err&&<div className="errorBox">{err}</div>}{items.length?<div className="list">{items.map(o=><div className="listItem" key={o.id}><div><b>{o.product?.name||"Software purchase"}</b><span>Order {o.id}</span></div><strong>{money(o.amount)}</strong><Link className="secondaryBtn" to="/downloads">Downloads</Link></div>)}</div>:<Empty title="No purchases yet" text="Your verified purchases and licenses will appear here."/>}</main>
}

function Downloads(){
  const [msg,setMsg]=React.useState(""); const [orderId,setOrderId]=React.useState("");
  async function download(){try{const d=await api("/api/entitlements?action=download&orderId="+encodeURIComponent(orderId));window.location.href=d.url}catch(e){setMsg(e.message)}}
  return <main className="page narrow"><div className="eyebrow">PROTECTED DELIVERY</div><h1>Downloads</h1><p className="muted">Enter a paid order ID. The server verifies ownership and creates a 10-minute signed URL.</p><div className="panel form"><label>Order ID<input value={orderId} onChange={e=>setOrderId(e.target.value)} placeholder="Your order ID"/></label><button className="primaryBtn big" onClick={download}>Generate secure download</button>{msg&&<div className="errorBox">{msg}</div>}</div></main>
}

function Notifications(){
  const [items,setItems]=React.useState([]); const [msg,setMsg]=React.useState("");
  async function load(){try{const d=await api("/api/notifications");setItems(d.notifications||[])}catch(e){setMsg(e.message)}}
  React.useEffect(()=>{load()},[]);
  async function read(id){await api("/api/notifications?action=read",{method:"POST",body:JSON.stringify({id})});load()}
  async function enable(){try{await enablePushNotifications();setMsg("Push notifications enabled on this device.")}catch(e){setMsg(e.message)}}
  return <main className="page"><div className="eyebrow">NOTIFICATION CENTER</div><div className="dashHead"><div><h1>Notifications</h1><p className="muted">FCM is the instant delivery layer; Supabase keeps your history.</p></div><button className="primaryBtn" onClick={enable}>Enable push</button></div>{msg&&<div className="notice">{msg}</div>}<div className="list">{items.length?items.map(n=><button className={"listItem notification "+(n.read?"":"unread")} key={n.id} onClick={()=>read(n.id)}><div><b>{n.title}</b><span>{n.message}</span></div><small>{new Date(n.created_at).toLocaleString()}</small></button>):<Empty title="You're all caught up" text="Purchase, license, update and account notifications will appear here."/>}</div></main>
}

function Settings(){
  const [msg,setMsg]=React.useState("");
  async function enable(){try{await enablePushNotifications();setMsg("Push notifications enabled.")}catch(e){setMsg(e.message)}}
  return <main className="page narrow"><div className="eyebrow">SETTINGS</div><h1>Account & notifications</h1><section className="panel"><h2>Push notifications</h2><p className="muted">Receive purchase, license, sale and important account alerts.</p><button className="primaryBtn" onClick={enable}>Enable browser notifications</button>{msg&&<p>{msg}</p>}</section><section className="panel"><h2>Security</h2><p>Firebase handles authentication. Source code stays in private Supabase Storage.</p><p>Download URLs expire after a short period.</p></section></main>
}

function VerifyLicense(){const {key}=useParams();const [d,setD]=React.useState(null);React.useEffect(()=>{fetch("/api/entitlements?action=verify&key="+encodeURIComponent(key)).then(r=>r.json()).then(setD)},[key]);return <main className="authPage"><div className="authCard"><div className="eyebrow">LICENSE VERIFICATION</div><h1>{d?.valid?"Valid license":"License verification"}</h1><code>{key}</code><p>{d?.message||"Checking license…"}</p></div></main>}
function Empty({title,text}){return <div className="empty"><h2>{title}</h2><p>{text}</p><Link className="primaryBtn" to="/explore">Explore products</Link></div>}

function App(){
  const [user,setUser]=React.useState(undefined);
  React.useEffect(()=>onAuthStateChanged(auth,setUser),[]);
  if(user===undefined)return <div className="loading">Loading DevMarket…</div>;
  return <Layout user={user}><Routes>
    <Route path="/" element={<Home/>}/><Route path="/explore" element={<Explore/>}/><Route path="/product/:slug" element={<Product/>}/><Route path="/developer/:username" element={<Developer/>}/>
    <Route path="/login" element={<Auth/>}/><Route path="/signup" element={<Auth/>}/>
    <Route path="/dashboard" element={<Protected user={user}><Dashboard user={user}/></Protected>}/>
    <Route path="/dashboard/products/new" element={<Protected user={user}><NewProduct user={user}/></Protected>}/>
    <Route path="/dashboard/products" element={<Protected user={user}><Dashboard user={user}/></Protected>}/>
    <Route path="/dashboard/sales" element={<Protected user={user}><Dashboard user={user}/></Protected>}/>
    <Route path="/dashboard/licenses" element={<Protected user={user}><Dashboard user={user}/></Protected>}/>
    <Route path="/dashboard/analytics" element={<Protected user={user}><Dashboard user={user}/></Protected>}/>
    <Route path="/dashboard/settings" element={<Protected user={user}><Settings/></Protected>}/>
    <Route path="/purchases" element={<Protected user={user}><Purchases/></Protected>}/>
    <Route path="/downloads" element={<Protected user={user}><Downloads/></Protected>}/>
    <Route path="/notifications" element={<Protected user={user}><Notifications/></Protected>}/>
    <Route path="/settings" element={<Protected user={user}><Settings/></Protected>}/>
    <Route path="/license/verify/:key" element={<VerifyLicense/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></Layout>
}
createRoot(document.getElementById("root")).render(<BrowserRouter><ErrorBoundary><App/></ErrorBoundary></BrowserRouter>);
