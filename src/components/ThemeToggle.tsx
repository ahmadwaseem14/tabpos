'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Determine active theme on load
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute('data-theme', storedTheme);
    } else {
      // Default to dark
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      aria-label="Toggle Theme"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
        borderRadius: '12px',
        background: 'var(--bg-active)',
        border: '1px solid var(--border)',
        color: 'var(--foreground)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      
      <style jsx>{`
        button:hover {
          background: var(--border);
          transform: translateY(-1px);
        }
        button:active {
          transform: translateY(0);
        }
      `}</style>
    </button>
  );
}
