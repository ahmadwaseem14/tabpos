'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Filter, CheckCircle, XCircle, Clock, Layers, RefreshCw, Package, ScanLine } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import MobileScanner from '@/components/MobileScanner';

interface TabletInstance {
  imei: string;
  serialNumber: string | null;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  color: string;
  purchasePrice: number;
  sellingPrice: number | null;
  locationType: string;
  locationShopkeeper: string | null;
  qcStatus: string;
  status: string;
  purchaseInvoiceNo: string | null;
  createdAt: string;
  checkedAt: string | null;
  checkedNotes: string | null;
}

export default function InventoryPage() {
  const [tablets, setTablets] = useState<TabletInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [qcFilter, setQcFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showScanner, setShowScanner] = useState(false);

  // QC Update modal
  const [showQcModal, setShowQcModal] = useState(false);
  const [qcTablet, setQcTablet] = useState<TabletInstance | null>(null);
  const [qcNewStatus, setQcNewStatus] = useState<'CHECKED_OK' | 'FAULTY' | 'UNCHECKED'>('CHECKED_OK');
  const [qcNotes, setQcNotes] = useState('');

  const addToast = (text: string, type: 'success' | 'warning' | 'error') => {
    setToasts(prev => [...prev, { id: Math.random().toString(), text, type }]);
  };

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (qcFilter !== 'ALL') params.set('qc', qcFilter);
      if (locationFilter !== 'ALL') params.set('location', locationFilter);

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTablets(data.tablets || []);
      }
    } catch (err) {
      addToast('Failed to load inventory data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, qcFilter, locationFilter]);

  useEffect(() => {
    const t = setTimeout(loadInventory, 200);
    return () => clearTimeout(t);
  }, [loadInventory]);

  const openQcModal = (tablet: TabletInstance) => {
    setQcTablet(tablet);
    setQcNewStatus(tablet.qcStatus as any || 'CHECKED_OK');
    setQcNotes(tablet.checkedNotes || '');
    setShowQcModal(true);
  };

  const handleQcUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcTablet) return;
    try {
      const res = await fetch('/api/inventory/qc', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imei: qcTablet.imei, qcStatus: qcNewStatus, checkedNotes: qcNotes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast(`QC status updated to ${qcNewStatus}.`, 'success');
        setShowQcModal(false);
        loadInventory();
      } else {
        addToast(data.error || 'Failed to update QC status.', 'error');
      }
    } catch {
      addToast('Network error updating QC.', 'error');
    }
  };

  const handleScanResult = (code: string) => {
    setSearchQuery(code);
    setShowScanner(false);
  };

  const getQcBadge = (status: string) => {
    switch (status) {
      case 'CHECKED_OK': return <span className="badge badge-success">✓ Checked OK</span>;
      case 'FAULTY': return <span className="badge badge-danger">✗ Faulty</span>;
      default: return <span className="badge badge-warning">⏱ Unchecked</span>;
    }
  };

  const getLocationBadge = (loc: string, shopName?: string | null) => {
    if (loc === 'WAREHOUSE') return <span className="badge badge-primary">Warehouse</span>;
    if (loc === 'OWN_SHOP') return <span className="badge badge-success">Own Shop</span>;
    return <span className="badge" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>{shopName || 'Shopkeeper'}</span>;
  };

  // Stats
  const warehouseCount = tablets.filter(t => t.locationType === 'WAREHOUSE').length;
  const uncheckedCount = tablets.filter(t => t.qcStatus === 'UNCHECKED').length;
  const faultyCount = tablets.filter(t => t.qcStatus === 'FAULTY').length;

  return (
    <div className="inventory-page">
      <ToastContainer toasts={toasts} onClose={id => setToasts(p => p.filter(t => t.id !== id))} />
      {showScanner && <MobileScanner onScan={handleScanResult} onClose={() => setShowScanner(false)} />}

      {/* Summary KPIs */}
      <div className="kpi-row">
        <div className="kpi-card">
          <Package size={20} />
          <div>
            <span>Total Matching</span>
            <strong>{tablets.length}</strong>
          </div>
        </div>
        <div className="kpi-card warehouse">
          <Layers size={20} />
          <div>
            <span>In Warehouse</span>
            <strong>{warehouseCount}</strong>
          </div>
        </div>
        <div className="kpi-card warning">
          <Clock size={20} />
          <div>
            <span>Awaiting QC</span>
            <strong>{uncheckedCount}</strong>
          </div>
        </div>
        <div className="kpi-card danger">
          <XCircle size={20} />
          <div>
            <span>Faulty Units</span>
            <strong>{faultyCount}</strong>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by IMEI, brand, model, or serial..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="clear-btn">✕</button>}
        </div>
        <button className="scan-btn" onClick={() => setShowScanner(true)}>
          <ScanLine size={18} />
          <span>Scan IMEI</span>
        </button>
        <button className="refresh-btn" onClick={loadInventory}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <div className="filter-group">
          <label>QC Status:</label>
          <select value={qcFilter} onChange={e => setQcFilter(e.target.value)}>
            <option value="ALL">All</option>
            <option value="UNCHECKED">Unchecked</option>
            <option value="CHECKED_OK">Checked OK</option>
            <option value="FAULTY">Faulty</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Location:</label>
          <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
            <option value="ALL">All Locations</option>
            <option value="WAREHOUSE">Warehouse</option>
            <option value="SHOPKEEPER">At Shopkeepers</option>
            <option value="OWN_SHOP">Own Shop</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Item Status:</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All</option>
            <option value="AVAILABLE">Available</option>
            <option value="SOLD">Sold</option>
            <option value="RETURNED_TO_SUPPLIER">Returned</option>
            <option value="DAMAGED">Damaged</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card table-card">
        {loading ? (
          <div className="spinner-center">
            <div className="spinner"></div>
            <span>Loading inventory data...</span>
          </div>
        ) : (
          <div className="pos-table-container responsive-table-cards">
            <table className="pos-table">
              <thead>
                <tr>
                  <th>Brand / Model</th>
                  <th>IMEI</th>
                  <th>Purchase Cost</th>
                  <th>Location</th>
                  <th>QC Status</th>
                  <th>Date Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tablets.length ? tablets.map(tab => (
                  <tr key={tab.imei} className={tab.qcStatus === 'UNCHECKED' ? 'row-highlight' : ''}>
                    <td data-label="Brand / Model">
                      <strong>{tab.brand} {tab.model}</strong>
                      <div className="sub-text">{tab.ram} / {tab.storage} • {tab.color}</div>
                    </td>
                    <td data-label="IMEI">
                      <strong className="imei-text">{tab.imei}</strong>
                      {tab.serialNumber && <div className="sub-text">S/N: {tab.serialNumber}</div>}
                    </td>
                    <td data-label="Purchase Cost">{formatCurrency(tab.purchasePrice)}</td>
                    <td data-label="Location">{getLocationBadge(tab.locationType, tab.locationShopkeeper)}</td>
                    <td data-label="QC Status">{getQcBadge(tab.qcStatus)}</td>
                    <td data-label="Date Added">{formatDate(tab.createdAt)}</td>
                    <td data-label="Actions">
                      <button className="qc-action-btn" onClick={() => openQcModal(tab)}>
                        Update QC
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      <Layers size={32} />
                      <span>No tablets match the current filters</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QC Update Modal */}
      {showQcModal && qcTablet && (
        <div className="modal-backdrop" onClick={() => setShowQcModal(false)}>
          <div className="modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update QC Inspection Status</h3>
              <button onClick={() => setShowQcModal(false)}>✕</button>
            </div>
            <form onSubmit={handleQcUpdate}>
              <div className="modal-body">
                <div className="tablet-qc-info">
                  <strong>{qcTablet.brand} {qcTablet.model}</strong>
                  <span>IMEI: {qcTablet.imei}</span>
                </div>
                <div className="qc-options">
                  <label className={`qc-option-btn ${qcNewStatus === 'CHECKED_OK' ? 'selected-ok' : ''}`}>
                    <input type="radio" name="qcStatus" value="CHECKED_OK" checked={qcNewStatus === 'CHECKED_OK'} onChange={() => setQcNewStatus('CHECKED_OK')} />
                    <CheckCircle size={20} />
                    <span>Checked OK</span>
                    <small>No faults found. Ready for transfer/sale.</small>
                  </label>
                  <label className={`qc-option-btn ${qcNewStatus === 'FAULTY' ? 'selected-faulty' : ''}`}>
                    <input type="radio" name="qcStatus" value="FAULTY" checked={qcNewStatus === 'FAULTY'} onChange={() => setQcNewStatus('FAULTY')} />
                    <XCircle size={20} />
                    <span>Faulty / Defective</span>
                    <small>Has hardware or software faults. Needs return or repair.</small>
                  </label>
                  <label className={`qc-option-btn ${qcNewStatus === 'UNCHECKED' ? 'selected-pending' : ''}`}>
                    <input type="radio" name="qcStatus" value="UNCHECKED" checked={qcNewStatus === 'UNCHECKED'} onChange={() => setQcNewStatus('UNCHECKED')} />
                    <Clock size={20} />
                    <span>Mark as Unchecked</span>
                    <small>Reset to pending inspection status.</small>
                  </label>
                </div>
                <div className="input-group">
                  <label>Inspection Notes (Optional)</label>
                  <textarea rows={3} placeholder="Screen quality, battery health, any specific faults..." value={qcNotes} onChange={e => setQcNotes(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowQcModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save QC Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .inventory-page { display: flex; flex-direction: column; gap: 20px; }
        .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
        .kpi-card { background: var(--bg-card); border: 1px solid var(--border); padding: 16px; border-radius: 14px; display: flex; align-items: center; gap: 14px; }
        .kpi-card > svg { color: var(--primary); }
        .kpi-card.warehouse > svg { color: var(--secondary); }
        .kpi-card.warning > svg { color: var(--warning); }
        .kpi-card.danger > svg { color: var(--danger); }
        .kpi-card div { display: flex; flex-direction: column; }
        .kpi-card span { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
        .kpi-card strong { font-size: 1.4rem; font-weight: 800; }
        .toolbar { display: flex; gap: 10px; align-items: center; }
        .search-box { flex: 1; display: flex; align-items: center; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; gap: 10px; }
        .search-box input { flex: 1; border: none; background: transparent; outline: none; font-size: 0.875rem; }
        .search-box:focus-within { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
        .clear-btn { color: var(--text-muted); font-size: 0.875rem; }
        .scan-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; background: var(--primary); color: var(--text-inverse); font-weight: 600; font-size: 0.875rem; white-space: nowrap; }
        .refresh-btn { padding: 10px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted); }
        .refresh-btn:hover { color: var(--foreground); background: var(--bg-active); }
        .filters-row { display: flex; gap: 16px; flex-wrap: wrap; }
        .filter-group { display: flex; align-items: center; gap: 8px; }
        .filter-group label { font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); white-space: nowrap; }
        .filter-group select { padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-card); font-size: 0.8125rem; outline: none; }
        .filter-group select:focus { border-color: var(--primary); }
        .table-card { padding: 0; overflow: hidden; }
        .row-highlight { background: rgba(245, 158, 11, 0.03); }
        .sub-text { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .imei-text { font-family: monospace; font-size: 0.8rem; }
        .qc-action-btn { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-active); font-size: 0.75rem; font-weight: 600; transition: all 0.2s; }
        .qc-action-btn:hover { border-color: var(--primary); color: var(--primary); }
        .spinner-center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; gap: 12px; color: var(--text-muted); font-size: 0.875rem; }
        .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-row { text-align: center; padding: 60px !important; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
        .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-card { background: var(--bg-card); border: 1px solid var(--border); width: 100%; max-width: 480px; border-radius: 20px; box-shadow: var(--shadow-lg); overflow: hidden; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
        .modal-header h3 { font-size: 1rem; font-weight: 700; }
        .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .modal-footer { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }
        .tablet-qc-info { background: var(--bg-active); padding: 12px 16px; border-radius: 10px; display: flex; flex-direction: column; }
        .tablet-qc-info strong { font-size: 0.9rem; }
        .tablet-qc-info span { font-size: 0.75rem; color: var(--text-muted); font-family: monospace; }
        .qc-options { display: flex; flex-direction: column; gap: 10px; }
        .qc-option-btn { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; border: 2px solid var(--border); cursor: pointer; transition: all 0.2s; position: relative; }
        .qc-option-btn input { position: absolute; opacity: 0; width: 0; }
        .qc-option-btn span { font-weight: 600; font-size: 0.875rem; }
        .qc-option-btn small { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 1px; }
        .qc-option-btn > svg { flex-shrink: 0; }
        .selected-ok { border-color: var(--success); background: var(--success-light); color: var(--success); }
        .selected-ok small { color: var(--success); opacity: 0.7; }
        .selected-faulty { border-color: var(--danger); background: var(--danger-light); color: var(--danger); }
        .selected-faulty small { color: var(--danger); opacity: 0.7; }
        .selected-pending { border-color: var(--warning); background: var(--warning-light); color: var(--warning); }
        .selected-pending small { color: var(--warning); opacity: 0.7; }
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-group label { font-size: 0.8125rem; font-weight: 600; }
        .input-group textarea { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--background); outline: none; font-size: 0.875rem; resize: vertical; }
        .input-group textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
        @media (max-width: 768px) { .filters-row { flex-direction: column; } .toolbar { flex-wrap: wrap; } }
      `}</style>
    </div>
  );
}
