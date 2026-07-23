'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import GlobalSearch from './GlobalSearch';
import { 
  X, 
  LayoutDashboard, 
  Truck, 
  Users, 
  Layers, 
  ArrowLeftRight, 
  Receipt, 
  DollarSign, 
  BarChart3, 
  Settings,
  LogOut,
  ShoppingCart,
  FileText,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLoginPage = pathname === '/login';

  // Prevent background scroll when search modal is open
  useEffect(() => {
    if (isSearchOpen || isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isSearchOpen, isMobileMenuOpen]);

  // Close menus on page change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
          window.location.href = '/login';
        }
      } catch (err) {
        console.error('Logout failed:', err);
      }
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Catalog', path: '/catalog', icon: BookOpen },
    { name: 'Suppliers', path: '/suppliers', icon: Truck },
    { name: 'Purchases', path: '/purchases', icon: ShoppingCart },
    { name: 'Shopkeepers', path: '/shopkeepers', icon: Users },
    { name: 'Inventory & QC', path: '/inventory', icon: Layers },
    { name: 'Transfers', path: '/transfers', icon: ArrowLeftRight },
    { name: 'Sales POS', path: '/sales', icon: Receipt },
    { name: 'Payments', path: '/payments', icon: DollarSign },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="layout-container">
      <Sidebar />
      
      <div className="main-content">
        <Navbar 
          onSearchOpen={() => setIsSearchOpen(true)} 
          onMenuOpen={() => setIsMobileMenuOpen(true)}
        />
        
        <main className="page-body">
          <div className="page-inner animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="menu-drawer-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="logo-box">T</div>
              <h3>Tabs POS</h3>
              <button className="close-drawer-btn" onClick={() => setIsMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <nav className="drawer-links">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.path);
                return (
                  <Link 
                    key={item.name} 
                    href={item.path} 
                    className={`drawer-link ${active ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              <button onClick={handleLogout} className="drawer-link logout">
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      <style jsx>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-left: var(--sidebar-width);
          min-height: 100vh;
          background: var(--background);
        }

        .page-body {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          padding-bottom: 40px;
        }

        .page-inner {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        /* Mobile Menu Drawer */
        .menu-drawer-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          justify-content: flex-end;
        }

        .menu-drawer {
          width: 280px;
          height: 100%;
          background: var(--bg-card);
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .drawer-header {
          display: flex;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border);
          gap: 12px;
        }

        .logo-box {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: var(--text-inverse);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .drawer-header h3 {
          font-size: 1.05rem;
          font-weight: 700;
          flex: 1;
        }

        .close-drawer-btn {
          color: var(--text-muted);
          padding: 4px;
          border-radius: 6px;
        }

        .drawer-links {
          flex: 1;
          padding: 20px 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
        }

        .drawer-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          color: var(--text-muted);
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .drawer-link:hover {
          background: var(--bg-active);
          color: var(--foreground);
        }

        .drawer-link.active {
          background: var(--primary-light);
          color: var(--primary);
          font-weight: 600;
        }

        [data-theme="dark"] .drawer-link.active {
          background: rgba(129, 140, 248, 0.1);
        }

        .drawer-link.logout {
          color: var(--danger);
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          margin-top: auto;
        }

        .drawer-link.logout:hover {
          background: var(--danger-light);
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }
          .page-body {
            padding: 12px;
            width: 100%;
            max-width: 100vw;
            box-sizing: border-box;
            overflow-x: hidden;
          }
          .page-inner {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            overflow-x: hidden;
          }
        }
      `}</style>
    </div>
  );
}
