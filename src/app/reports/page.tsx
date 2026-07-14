'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Download, TrendingUp, TrendingDown, Package, Users, Truck } from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import Chart from '@/components/Chart';

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
}

interface ChartData {
  labels: string[];
  sales: number[];
  purchases: number[];
  profits: number[];
  cashInflow: number[];
  cashOutflow: number[];
}

export default function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setCharts(data.charts);
        }
      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleExportSales = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/sales');
      if (res.ok) {
        const data = await res.json();
        const rows = data.invoices.map((inv: any) => [
          inv.invoiceNo,
          formatDate(inv.date),
          inv.shopkeeper.shopName,
          inv._count.tablets,
          inv.totalAmount,
          inv.paymentReceived,
          inv.totalAmount - inv.paymentReceived,
          inv.paymentMethod
        ]);
        exportToCSV('sales-report', ['Invoice#', 'Date', 'Shopkeeper', 'Items', 'Total', 'Paid', 'Balance', 'Method'], rows);
      }
    } catch { } finally { setExporting(false); }
  };

  const handleExportInventory = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        const rows = data.tablets.map((t: any) => [
          t.imei, t.serialNumber || '', t.brand, t.model, t.ram, t.storage, t.color,
          t.purchasePrice, t.sellingPrice || '', t.locationType, t.locationShopkeeper || '', t.qcStatus, t.status, formatDate(t.createdAt)
        ]);
        exportToCSV('inventory-report', ['IMEI', 'Serial#', 'Brand', 'Model', 'RAM', 'Storage', 'Color', 'Purchase Price', 'Selling Price', 'Location', 'Shopkeeper', 'QC Status', 'Status', 'Date Added'], rows);
      }
    } catch { } finally { setExporting(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner"></div></div>;

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h2>Financial Reports</h2>
          <p>Analytics, profit margins, and export tools</p>
        </div>
        <div className="export-btns">
          <button className="btn-secondary export-btn" onClick={handleExportSales} disabled={exporting}>
            <Download size={16} /> Export Sales CSV
          </button>
          <button className="btn-secondary export-btn" onClick={handleExportInventory} disabled={exporting}>
            <Download size={16} /> Export Inventory CSV
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="metrics-grid">
          <div className="metric-card profit">
            <TrendingUp size={24} />
            <div>
              <span>Overall Profit (All Time)</span>
              <strong>{formatCurrency(stats.overallProfit)}</strong>
            </div>
          </div>
          <div className="metric-card monthly">
            <BarChart3 size={24} />
            <div>
              <span>This Month's Profit</span>
              <strong>{formatCurrency(stats.monthlyProfit)}</strong>
            </div>
          </div>
          <div className="metric-card inventory">
            <Package size={24} />
            <div>
              <span>Total Inventory Value</span>
              <strong>{formatCurrency(stats.inventoryValue)}</strong>
            </div>
          </div>
          <div className="metric-card receivables">
            <Users size={24} />
            <div>
              <span>Total Receivables</span>
              <strong>{formatCurrency(stats.outstandingBalance)}</strong>
            </div>
          </div>
          <div className="metric-card payables">
            <Truck size={24} />
            <div>
              <span>Total Payables (Suppliers)</span>
              <strong>{formatCurrency(stats.supplierPayables)}</strong>
            </div>
          </div>
          <div className="metric-card stock">
            <Package size={24} />
            <div>
              <span>Total Stock (all locations)</span>
              <strong>{stats.warehouseStock + stats.stockAtShopkeepers + stats.stockAtOwnShop} <small>tablets</small></strong>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {charts && (
        <div className="charts-section">
          <div className="card chart-card">
            <h4>7-Day Revenue vs Profit</h4>
            <Chart labels={charts.labels} datasets={[
              { label: 'Sales Revenue', data: charts.sales, color: '#0ea5e9' },
              { label: 'Owner Profit', data: charts.profits, color: '#10b981' },
              { label: 'Purchases', data: charts.purchases, color: '#f59e0b' }
            ]} type="line" height={250} />
          </div>
          <div className="card chart-card">
            <h4>7-Day Cash Flow</h4>
            <Chart labels={charts.labels} datasets={[
              { label: 'Cash Received', data: charts.cashInflow, color: '#10b981' },
              { label: 'Cash Paid Out', data: charts.cashOutflow, color: '#ef4444' }
            ]} type="bar" height={250} />
          </div>
        </div>
      )}

      <style jsx>{`
        .reports-page { display: flex; flex-direction: column; gap: 24px; }
        .reports-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .reports-header h2 { font-size: 1.4rem; font-weight: 700; }
        .reports-header p { color: var(--text-muted); font-size: 0.875rem; }
        .export-btns { display: flex; gap: 10px; }
        .export-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; font-size: 0.875rem; font-weight: 600; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .metric-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: flex; align-items: center; gap: 16px; }
        .metric-card.profit { border-left: 3px solid var(--success); }
        .metric-card.profit > svg { color: var(--success); }
        .metric-card.monthly { border-left: 3px solid var(--primary); }
        .metric-card.monthly > svg { color: var(--primary); }
        .metric-card.inventory { border-left: 3px solid var(--secondary); }
        .metric-card.inventory > svg { color: var(--secondary); }
        .metric-card.receivables { border-left: 3px solid var(--warning); }
        .metric-card.receivables > svg { color: var(--warning); }
        .metric-card.payables { border-left: 3px solid var(--danger); }
        .metric-card.payables > svg { color: var(--danger); }
        .metric-card.stock > svg { color: var(--text-muted); }
        .metric-card div { display: flex; flex-direction: column; gap: 4px; }
        .metric-card span { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
        .metric-card strong { font-size: 1.2rem; font-weight: 800; }
        .metric-card strong small { font-size: 0.75rem; font-weight: 400; color: var(--text-muted); }
        .charts-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; }
        .chart-card { padding: 20px; }
        .chart-card h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; }
        .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .charts-section { grid-template-columns: 1fr; } .export-btns { flex-direction: column; } }
      `}</style>
    </div>
  );
}
