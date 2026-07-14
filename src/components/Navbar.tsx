'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Search, User, Server, Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  onSearchOpen: () => void;
  onMenuOpen?: () => void;
}

export default function Navbar({ onSearchOpen, onMenuOpen }: NavbarProps) {
  const pathname = usePathname();

  const getPageTitle = () => {
    const segment = pathname.split('/')[1] || '';
    if (!segment) return 'Overview';
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
  };

  // Keyboard shortcut listener to open search when '/' is pressed
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        onSearchOpen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchOpen]);

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onMenuOpen && (
          <button className="mobile-menu-btn" onClick={onMenuOpen}>
            <Menu size={24} />
          </button>
        )}
        <h1 className="page-title">{getPageTitle()}</h1>
      </div>

      <div className="navbar-center" onClick={onSearchOpen}>
        <div className="search-trigger">
          <Search size={16} className="search-icon" />
          <span>Search IMEI, Brand, Model...</span>
          <kbd className="search-hotkey">/</kbd>
        </div>
      </div>

      <div className="navbar-right">
        <button className="mobile-search-btn" onClick={onSearchOpen}>
          <Search size={20} />
        </button>

        <div className="status-indicator">
          <Server size={14} className="status-icon" />
          <span>Live Cloud DB</span>
          <span className="status-dot"></span>
        </div>

        <ThemeToggle />

        <div className="profile-section">
          <div className="profile-avatar">
            <User size={16} />
          </div>
          <span className="profile-name">Owner</span>
        </div>
      </div>

      <style jsx>{`
        .navbar {
          height: var(--navbar-height);
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 80;
        }

        .page-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--foreground);
        }

        .navbar-center {
          flex: 0 1 400px;
          cursor: pointer;
        }

        .search-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-muted);
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-trigger:hover {
          border-color: var(--primary);
          background: var(--bg-card);
          box-shadow: 0 0 0 2px var(--primary-glow);
        }

        .search-icon {
          margin-right: 8px;
        }

        .search-hotkey {
          background: var(--bg-card);
          border: 1px solid var(--border);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-family: monospace;
          color: var(--text-muted);
          box-shadow: var(--shadow-sm);
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--success);
          background: var(--success-light);
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 600;
        }

        [data-theme="dark"] .status-indicator {
          background: rgba(52, 211, 153, 0.1);
        }

        .status-icon {
          opacity: 0.9;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background: var(--success);
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 6px var(--success);
        }

        .profile-section {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 8px;
          border-left: 1px solid var(--border);
        }

        .profile-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-active);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          border: 1px solid var(--border);
        }

        .profile-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--foreground);
        }

        .mobile-menu-btn {
          display: none;
          color: var(--foreground);
          padding: 8px;
          margin-left: -8px;
          margin-right: 8px;
          border-radius: 8px;
        }

        .mobile-menu-btn:hover {
          background: var(--bg-active);
        }

        .mobile-search-btn {
          display: none;
          color: var(--foreground);
          padding: 8px;
          border-radius: 8px;
        }

        .mobile-search-btn:hover {
          background: var(--bg-active);
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 0 16px;
          }
          .mobile-menu-btn, .mobile-search-btn {
            display: flex;
            align-items: center;
          }
          .navbar-center {
            display: none;
          }
          .status-indicator, .profile-name {
            display: none;
          }
          .profile-section {
            border-left: none;
            padding-left: 0;
          }
        }
      `}</style>
    </header>
  );
}
