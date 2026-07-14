'use client';

import React, { useEffect, useState } from 'react';
import Chart from '@/components/Chart';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Layers, 
  Truck, 
  Users, 
  AlertTriangle, 
  Activity, 
  Smartphone,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  salesToday: number;
  purchasesToday: number;
  monthlyProfit: number;
  overallProfit: number;
  inventoryValue: number;
  warehouseStock: number;
  stockAtShopkeepers: number;
  stockAtOwnShop: number;
  outstandingBalance: number;
  supplierPayables: number;
  lowStockAlert: number;
  outOfStock: number;
}

interface ActivityLog {
  id: string;
  date: string;
  type: string;
  details: string;
}

interface RankingItem {
  brand?: string;
  model?: string;
  ram?: string;
  storage?: string;
  color?: string;
  salesCount?: number;
  shopName?: string;
  salesValue?: number;
  profit?: number;
  modelName?: string;
  ownerName?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rankings, setRankings] = useState<{
    fastMoving: RankingItem[];
    mostProfitableModel: RankingItem | null;
    topSellingShopkeeper: RankingItem | null;
    recentLogs: ActivityLog[];
  } | null>(null);
  const [charts, setCharts] = useState<{
    labels: string[];
    sales: number[];
    purchases: number[];
    profits: number[];
    cashInflow: number[];
    cashOutflow: number[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRankings(data.rankings);
        setCharts(data.charts);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <span>Compiling real-time statistics...</span>
        <style jsx>{`
          .dashboard-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: calc(100vh - var(--navbar-height) - 100px);
            gap: 16px;
            color: var(--text-muted);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--border);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!stats || !rankings || !charts) return null;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header-row">
        <div className="welcome-box">
          <h2>Overview Panel</h2>
          <p>Real-time analytics and inventory valuation metrics.</p>
        </div>
        <button className="refresh-btn" onClick={fetchDashboardData}>
          <RefreshCw size={16} />
          <span>Sync Live</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon-wrapper sales">
            <DollarSign size={22} />
          </div>
          <div className="stat-data">
            <span>Today's Sales</span>
            <h3>{formatCurrency(stats.salesToday)}</h3>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon-wrapper purchases">
            <ShoppingCart size={22} />
          </div>
          <div className="stat-data">
            <span>Today's Purchases</span>
            <h3>{formatCurrency(stats.purchasesToday)}</h3>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon-wrapper profit">
            <TrendingUp size={22} />
          </div>
          <div className="stat-data">
            <span>Monthly Profit</span>
            <h3 className="text-success">{formatCurrency(stats.monthlyProfit)}</h3>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon-wrapper inventory">
            <Layers size={22} />
          </div>
          <div className="stat-data">
            <span>Inventory Value</span>
            <h3>{formatCurrency(stats.inventoryValue)}</h3>
          </div>
        </div>
      </div>

      {/* Second row of smaller KPIs */}
      <div className="sub-kpis-grid">
        <div className="kpi-box">
          <span className="kpi-label">Warehouse Stock</span>
          <span className="kpi-value">{stats.warehouseStock} <small>pcs</small></span>
        </div>
        <div className="kpi-box">
          <span className="kpi-label">Stock at Shopkeepers</span>
          <span className="kpi-value">{stats.stockAtShopkeepers} <small>pcs</small></span>
        </div>
        <div className="kpi-box">
          <span className="kpi-label">Stock at Own Shop</span>
          <span className="kpi-value">{stats.stockAtOwnShop} <small>pcs</small></span>
        </div>
        <div className="kpi-box outstanding">
          <span className="kpi-label">Outstanding Receivables</span>
          <span className="kpi-value">{formatCurrency(stats.outstandingBalance)}</span>
        </div>
        <div className="kpi-box payables">
          <span className="kpi-label">Supplier Payables</span>
          <span className="kpi-value">{formatCurrency(stats.supplierPayables)}</span>
        </div>
      </div>

      {/* Critical Stock Alerts */}
      {(stats.lowStockAlert > 0 || stats.outOfStock > 0) && (
        <div className="alert-banner">
          <AlertTriangle size={20} />
          <div>
            <strong>Inventory Alerts:</strong>
            <span> {stats.outOfStock} models out of stock, and {stats.lowStockAlert} models running low (less than 5 units left).</span>
          </div>
          <Link href="/inventory" className="alert-link">
            <span>Resolve Inventory</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Charts Section */}
      <div className="charts-grid">
        <div className="card chart-card">
          <h4>Revenue & Profit Trends (7 Days)</h4>
          <Chart 
            labels={charts.labels} 
            datasets={[
              { label: 'Sales Revenue', data: charts.sales, color: '#0ea5e9' },
              { label: 'Owner Profit', data: charts.profits, color: '#10b981' }
            ]} 
            type="line" 
          />
        </div>

        <div className="card chart-card">
          <h4>Cash Flow (Inflows vs Outflows)</h4>
          <Chart 
            labels={charts.labels} 
            datasets={[
              { label: 'Inflow (From Customers)', data: charts.cashInflow, color: '#10b981' },
              { label: 'Outflow (To Suppliers)', data: charts.cashOutflow, color: '#ef4444' }
            ]} 
            type="bar" 
          />
        </div>
      </div>

      {/* Rankings and Activity Logs */}
      <div className="details-grid">
        {/* Rankings Card */}
        <div className="card info-card">
          <h4>Performance Leaderboards</h4>
          <div className="ranking-section">
            <div className="leaderboard-item">
              <h5>Fast Moving Tablet Models</h5>
              {rankings.fastMoving.length ? (
                <ul className="leader-list">
                  {rankings.fastMoving.map((item, idx) => (
                    <li key={idx}>
                      <span className="rank-num">{idx + 1}</span>
                      <div className="rank-text">
                        <strong>{item.brand} {item.model}</strong>
                        <span>{item.ram}/{item.storage} • {item.color}</span>
                      </div>
                      <span className="rank-qty">{item.salesCount} sold</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-data">No sales recorded yet</p>
              )}
            </div>

            <div className="leaderboard-item border-top">
              <h5>Most Profitable Configuration</h5>
              {rankings.mostProfitableModel ? (
                <div className="highlight-metric">
                  <Smartphone size={24} className="metric-icon" />
                  <div>
                    <strong>{rankings.mostProfitableModel.brand} {rankings.mostProfitableModel.modelName}</strong>
                    <span>Accumulated Profit: {formatCurrency(rankings.mostProfitableModel.profit)}</span>
                  </div>
                </div>
              ) : (
                <p className="no-data">No profit aggregated yet</p>
              )}
            </div>

            <div className="leaderboard-item border-top">
              <h5>Top Trading Shopkeeper</h5>
              {rankings.topSellingShopkeeper ? (
                <div className="highlight-metric shopkeeper">
                  <Users size={24} className="metric-icon" />
                  <div>
                    <strong>{rankings.topSellingShopkeeper.shopName}</strong>
                    <span>Owner: {rankings.topSellingShopkeeper.ownerName} • Sales: {formatCurrency(rankings.topSellingShopkeeper.salesValue)}</span>
                  </div>
                </div>
              ) : (
                <p className="no-data">No trade records yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Audit Logs Card */}
        <div className="card info-card">
          <h4>Recent Activity Feed</h4>
          <div className="logs-timeline">
            {rankings.recentLogs.length ? (
              <div className="logs-list">
                {rankings.recentLogs.map((log) => (
                  <div key={log.id} className="log-row">
                    <div className="log-meta">
                      <span className={`log-badge ${log.type.toLowerCase()}`}>
                        {log.type}
                      </span>
                      <span className="log-time">{formatDate(log.date)}</span>
                    </div>
                    <p className="log-details">{log.details}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="timeline-empty">
                <Activity size={32} />
                <span>Timeline is quiet. Actions you take will show up here.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .dashboard-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .welcome-box h2 {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .welcome-box p {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: var(--bg-active);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px 20px;
        }

        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon-wrapper.sales { background: var(--primary-light); color: var(--primary); }
        .stat-icon-wrapper.purchases { background: var(--secondary-light); color: var(--secondary); }
        .stat-icon-wrapper.profit { background: var(--success-light); color: var(--success); }
        .stat-icon-wrapper.inventory { background: rgba(99, 102, 241, 0.1); color: var(--primary); }

        .stat-data span {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .stat-data h3 {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-top: 4px;
        }

        .text-success {
          color: var(--success);
        }

        .sub-kpis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .kpi-box {
          background: var(--bg-active);
          border: 1px solid var(--border);
          padding: 14px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .kpi-box.outstanding {
          border-left: 3px solid var(--warning);
        }

        .kpi-box.payables {
          border-left: 3px solid var(--danger);
        }

        .kpi-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .kpi-value {
          font-size: 1.1rem;
          font-weight: 700;
        }

        .kpi-value small {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 400;
        }

        .alert-banner {
          background: var(--warning-light);
          border: 1px solid rgba(245, 158, 11, 0.1);
          color: var(--warning);
          padding: 14px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.875rem;
        }

        [data-theme="dark"] .alert-banner {
          background: rgba(245, 158, 11, 0.1);
        }

        .alert-banner strong {
          font-weight: 700;
        }

        .alert-link {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
          text-decoration: underline;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }

        .chart-card h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--foreground);
          margin-bottom: 16px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }

        .info-card h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--foreground);
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
        }

        .ranking-section {
          display: flex;
          flex-direction: column;
        }

        .leaderboard-item {
          padding: 16px 0;
        }

        .leaderboard-item.border-top {
          border-top: 1px solid var(--border);
        }

        .leaderboard-item h5 {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .leader-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .leader-list li {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .rank-num {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--bg-active);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .rank-text {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .rank-text strong {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .rank-text span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .rank-qty {
          font-size: 0.8125rem;
          font-weight: 600;
          background: var(--primary-light);
          color: var(--primary);
          padding: 2px 8px;
          border-radius: 6px;
        }

        .highlight-metric {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--bg-active);
          padding: 12px 16px;
          border-radius: 12px;
        }

        .metric-icon {
          color: var(--primary);
        }

        .highlight-metric.shopkeeper .metric-icon {
          color: var(--secondary);
        }

        .highlight-metric div {
          display: flex;
          flex-direction: column;
        }

        .highlight-metric strong {
          font-size: 0.9rem;
          font-weight: 700;
        }

        .highlight-metric span {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .no-data {
          font-size: 0.8125rem;
          color: var(--text-muted);
          font-style: italic;
        }

        /* Timeline feed logs */
        .logs-timeline {
          max-height: 400px;
          overflow-y: auto;
        }

        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .log-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .log-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .log-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .log-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .log-badge.purchase { background: var(--secondary-light); color: var(--secondary); }
        .log-badge.transfer { background: var(--primary-light); color: var(--primary); }
        .log-badge.qc_update { background: var(--warning-light); color: var(--warning); }
        .log-badge.sale { background: var(--success-light); color: var(--success); }
        .log-badge.return { background: var(--danger-light); color: var(--danger); }
        .log-badge.payment { background: var(--success-light); color: var(--success); }
        .log-badge.system { background: var(--bg-active); color: var(--text-muted); }

        .log-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .log-details {
          font-size: 0.8125rem;
          line-height: 1.4;
          color: var(--foreground);
        }

        .timeline-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
          gap: 10px;
        }

        .timeline-empty span {
          font-size: 0.8125rem;
          max-width: 250px;
        }

        @media (max-width: 768px) {
          .charts-grid, .details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
