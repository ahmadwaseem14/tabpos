'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ArrowLeftRight, Receipt, Menu } from 'lucide-react';

interface BottomNavProps {
  onSearchOpen: () => void;
  onMenuOpen: () => void;
}

export default function BottomNav({ onSearchOpen, onMenuOpen }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav">
      <Link href="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
        <Home size={20} />
        <span>Dashboard</span>
      </Link>
      
      <button onClick={onSearchOpen} className="nav-item">
        <Search size={20} />
        <span>Locate</span>
      </button>

      <Link href="/transfers" className={`nav-item ${isActive('/transfers') ? 'active' : ''}`}>
        <ArrowLeftRight size={20} />
        <span>Transfer</span>
      </Link>

      <Link href="/sales" className={`nav-item ${isActive('/sales') ? 'active' : ''}`}>
        <Receipt size={20} />
        <span>Sales</span>
      </Link>

      <button onClick={onMenuOpen} className="nav-item">
        <Menu size={20} />
        <span>Menu</span>
      </button>

      <style jsx>{`
        .bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--bottom-nav-height);
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
          z-index: 90;
          padding: 0 10px;
          align-items: center;
          justify-content: space-around;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex: 1;
          height: 100%;
          color: var(--text-muted);
          transition: all 0.2s;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .nav-item:hover {
          color: var(--primary);
        }

        .nav-item.active {
          color: var(--primary);
          font-weight: 700;
        }

        button.nav-item {
          border: none;
          background: none;
          width: 100%;
        }

        @media (max-width: 768px) {
          .bottom-nav {
            display: flex;
          }
        }
      `}</style>
    </nav>
  );
}
