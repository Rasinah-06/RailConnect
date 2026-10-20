import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

// Station autocomplete. `value` is {code, name} or null.
export default function StationInput({ label, value, onChange, id }) {
  const [text, setText] = useState(value ? `${value.name} (${value.code})` : '');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef();

  useEffect(() => { setText(value ? `${value.name} (${value.code})` : ''); }, [value]);

  const search = (q) => {
    clearTimeout(timer.current);
    if (!q.trim()) { setItems([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const { stations } = await api('/stations', { params: { q } });
        setItems(stations);
        setActive(0);
      } catch { setItems([]); }
    }, 180);
  };

  const pick = (s) => {
    onChange({ code: s.code, name: s.name });
    setOpen(false);
  };

  const onKey = (e) => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <label className="field ac" htmlFor={id}>
      {label}
      <input
        id={id}
        value={text}
        autoComplete="off"
        placeholder="Station name or code"
        role="combobox"
        aria-expanded={open}
        onChange={(e) => { setText(e.target.value); setOpen(true); onChange(null); search(e.target.value); }}
        onFocus={(e) => { e.target.select(); if (text) { setOpen(true); search(text.replace(/\s*\(.*\)$/, '')); } }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKey}
      />
      {open && items.length > 0 && (
        <ul role="listbox">
          {items.map((s, i) => (
            <li key={s.code} role="option" aria-selected={i === active} onMouseDown={() => pick(s)}>
              <span>{s.name} <span className="muted small">{s.city}</span></span>
              <span className="code">{s.code}</span>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
