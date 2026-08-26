import React from "react";
import { createRoot } from "react-dom/client";

// ---------------------------------------------------------------------------
// Toast notifications — replaces every native alert().
// A tiny singleton so any component can call notify(...) without threading
// context/props through the whole tree.
// ---------------------------------------------------------------------------
let _push = null;
let _id = 0;

export function notify(message, type = "info") {
  if (_push) _push({ id: ++_id, message, type });
  else console.warn("[toast]", message);
}

function ToastHost() {
  const [toasts, setToasts] = React.useState([]);
  React.useEffect(() => {
    _push = (t) => {
      setToasts((cur) => [...cur, t]);
      setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), 4200);
    };
    return () => { _push = null; };
  }, []);
  return (
    <div className="toastStack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function mountToastHost() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  createRoot(el).render(<ToastHost />);
}

// ---------------------------------------------------------------------------
// Select — replaces native <select>, fully custom-styled dropdown.
// options: [{value,label}] or plain strings.
// ---------------------------------------------------------------------------
export function Select({ value, onChange, options, placeholder, name }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const current = norm.find((o) => o.value === value);

  React.useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div className={`customSelect${open ? " open" : ""}`} ref={ref}>
      <button type="button" name={name} className="customSelectTrigger" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{current ? current.label : (placeholder || "Select…")}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <ul className="customSelectPanel" role="listbox">
          {norm.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}
              className={`customSelectOption${o.value === value ? " selected" : ""}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
