'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
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
  ChevronRight,
  ShoppingCart,
  BookOpen
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };

  return (
    <aside className="sidebar">
      <div className="logo-section">
        <div className="logo-box">T</div>
        <div className="logo-text">
          <h2>Tabs POS</h2>
          <span>Owner Console</span>
        </div>
      </div>

      <nav className="nav-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link key={item.name} href={item.path} className={`menu-link ${active ? 'active' : ''}`}>
              <div className="link-content">
                <Icon size={18} className="link-icon" />
                <span>{item.name}</span>
              </div>
              {active && <ChevronRight size={14} className="active-indicator" />}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>

      <style jsx>{`
        .sidebar {
          width: var(--sidebar-width);
          background: var(--bg-sidebar);
          color: var(--text-inverse);
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          z-index: 95;
        }

        .logo-section {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--bg-sidebar-hover);
        }

        .logo-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: var(--text-inverse);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.3rem;
          box-shadow: 0 4px 10px var(--primary-glow);
        }

        .logo-text h2 {
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        .logo-text span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .nav-menu {
          flex: 1;
          padding: 24px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
        }

        .menu-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 10px;
          color: var(--text-muted);
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .menu-link:hover {
          background: var(--bg-sidebar-hover);
          color: var(--text-inverse);
        }

        .menu-link.active {
          background: var(--primary);
          color: var(--text-inverse);
          font-weight: 600;
        }

        .link-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .link-icon {
          opacity: 0.8;
        }

        .active-indicator {
          opacity: 0.8;
        }

        .sidebar-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--bg-sidebar-hover);
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          color: #f87171;
          font-weight: 500;
          font-size: 0.9rem;
          transition: background 0.2s;
          border: none;
          background: none;
        }

        .logout-btn:hover {
          background: rgba(248, 113, 113, 0.1);
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
