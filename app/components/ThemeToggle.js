'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null;
    const initial = stored || (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem('theme', next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-2 text-[13px] font-semibold text-text transition hover:border-brand hover:text-brand"
    >
      {theme === 'dark' ? 'Dark' : 'Light'} mode
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">{theme === 'dark' ? '🌙' : '☀️'}</span>
    </button>
  );
}
