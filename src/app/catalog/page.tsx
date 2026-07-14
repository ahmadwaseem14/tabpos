'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, Plus, Search, Trash2, Tablet, RefreshCw, Package } from 'lucide-react';
import { ToastContainer, ToastMessage } from '@/components/Toast';

interface TabletModel {
  id: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  color: string;
  stockAvailable: number;
  createdAt: string;
}

const BRANDS = ['Samsung', 'Huawei', 'Lenovo', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'Nokia', 'Apple', 'Tecno', 'Infinix', 'Itel'];
const RAM_OPTIONS = ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB'];
const STORAGE_OPTIONS = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'];
const COLORS = ['Black', 'White', 'Blue', 'Green', 'Silver', 'Gold', 'Rose Gold', 'Gray', 'Red', 'Purple'];

const BRAND_COLORS: Record<string, string> = {
  Samsung: '#1428A0', Huawei: '#CF0A2C', Lenovo: '#E2231A', Xiaomi: '#FF6900',
  Apple: '#555555', Oppo: '#1D2088', Vivo: '#415FFF', Realme: '#FFCC00',
  Nokia: '#124191', Tecno: '#00B0EA', Infinix: '#E91E3B', Itel: '#FF5722',
};

export default function CatalogPage() {
  const [models, setModels] = useState<TabletModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Form
  const [brand, setBrand] = useState('Samsung');
  const [model, setModel] = useState('');
  const [ram, setRam] = useState('4GB');
  const [storage, setStorage] = useState('64GB');
  const [color, setColor] = useState('Black');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const addToast = (text: string, type: 'success' | 'warning' | 'error') => {
    setToasts(prev => [...prev, { id: Math.random().toString(), text, type }]);
  };

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      const res = await fetch(`/api/catalog?${params}`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      }
    } catch { addToast('Failed to load catalog.', 'error'); }
    finally { setLoading(false); }
  }, [searchQuery]);

  useEffect(() => {
    const t = setTimeout(loadModels, 200);
    return () => clearTimeout(t);
  }, [loadModels]);

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) { addToast('Model name is required.', 'warning'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, model: model.trim(), ram, storage, color })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast(`${brand} ${model} added to catalog!`, 'success');
        setShowModal(false);
        setModel('');
        loadModels();
      } else {
        addToast(data.error || 'Failed to add model.', 'error');
      }
    } catch { addToast('Network error.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (m: TabletModel) => {
    if (m.stockAvailable > 0) {
      addToast(`Cannot delete — ${m.stockAvailable} unit(s) still in stock.`, 'warning');
      return;
    }
    if (!confirm(`Delete "${m.brand} ${m.model} (${m.ram}/${m.storage} ${m.color})" from catalog?`)) return;
    setDeletingId(m.id);
    try {
      const res = await fetch(`/api/catalog?id=${m.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Model removed from catalog.', 'success');
        loadModels();
      } else {
        addToast(data.error || 'Delete failed.', 'error');
      }
    } catch { addToast('Network error.', 'error'); }
    finally { setDeletingId(null); }
  };

  // Group by brand
  const grouped = models.reduce((acc: Record<string, TabletModel[]>, m) => {
    if (!acc[m.brand]) acc[m.brand] = [];
    acc[m.brand].push(m);
    return acc;
  }, {});

  const totalModels = models.length;
  const totalStock = models.reduce((s, m) => s + m.stockAvailable, 0);
  const brandCount = Object.keys(grouped).length;

  return (
    <div className="catalog-page">
      <ToastContainer toasts={toasts} onClose={id => setToasts(p => p.filter(t => t.id !== id))} />

      {/* Page Header */}
      <div className="page-header">
        <div className="header-info">
          <div className="header-icon">
            <BookOpen size={22} />
          </div>
          <div>
            <h2>Product Catalog</h2>
            <p>Manage your master list of tablet models — select from catalog when making purchases</p>
          </div>
        </div>
        <button className="btn-primary add-btn" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Add New Model
        </button>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-pill">
          <Tablet size={16} />
          <span><strong>{totalModels}</strong> Models in Catalog</span>
        </div>
        <div className="stat-pill">
          <Package size={16} />
          <span><strong>{totalStock}</strong> Units Available</span>
        </div>
        <div className="stat-pill">
          <BookOpen size={16} />
          <span><strong>{brandCount}</strong> Brands</span>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <Search size={16} />
        <input
          type="text"
          placeholder="Search models by name, brand, color..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && <button onClick={() => setSearchQuery('')} className="clear-btn">✕</button>}
        <button onClick={loadModels} className="refresh-btn"><RefreshCw size={15} /></button>
      </div>

      {/* Catalog Grid - Grouped by Brand */}
      {loading ? (
        <div className="spinner-center"><div className="spinner"></div><span>Loading catalog...</span></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} />
          <h3>Catalog is Empty</h3>
          <p>Add your first tablet model to get started. Once added, you can quickly pick models when recording purchases.</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Add First Model
          </button>
        </div>
      ) : (
        <div className="brands-list">
          {Object.entries(grouped).map(([brandName, brandModels]) => (
            <div key={brandName} className="brand-group">
              <div className="brand-header">
                <div className="brand-dot" style={{ background: BRAND_COLORS[brandName] || '#6366f1' }}></div>
                <h3>{brandName}</h3>
                <span className="brand-count">{brandModels.length} model{brandModels.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="models-grid">
                {brandModels.map(m => (
                  <div key={m.id} className="model-card">
                    <div className="model-card-top">
                      <div className="model-brand-badge" style={{ background: (BRAND_COLORS[m.brand] || '#6366f1') + '22', color: BRAND_COLORS[m.brand] || '#6366f1' }}>
                        {m.brand}
                      </div>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(m)}
                        disabled={deletingId === m.id}
                        title={m.stockAvailable > 0 ? `${m.stockAvailable} units in stock — cannot delete` : 'Delete model'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="model-name">{m.model}</div>
                    <div className="model-specs">
                      <span className="spec-tag">{m.ram}</span>
                      <span className="spec-tag">{m.storage}</span>
                      <span className="spec-tag color-tag">{m.color}</span>
                    </div>
                    <div className="model-stock">
                      <Package size={12} />
                      <span className={m.stockAvailable > 0 ? 'in-stock' : 'out-stock'}>
                        {m.stockAvailable > 0 ? `${m.stockAvailable} in stock` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Model Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Tablet size={20} className="modal-icon" />
                <h3>Add Model to Catalog</h3>
              </div>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddModel}>
              <div className="modal-body">
                <p className="modal-hint">
                  Define a tablet model once here. When you buy this model from a supplier, just pick it from the list — no need to type brand, RAM, or storage again.
                </p>

                <div className="form-grid">
                  <div className="input-group">
                    <label>Brand</label>
                    <select value={brand} onChange={e => setBrand(e.target.value)}>
                      {BRANDS.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Model Name <span className="req">*</span></label>
                    <input
                      type="text"
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      placeholder="e.g. Galaxy A55, Tab M10, MatePad 11"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="input-group">
                    <label>RAM</label>
                    <select value={ram} onChange={e => setRam(e.target.value)}>
                      {RAM_OPTIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Storage</label>
                    <select value={storage} onChange={e => setStorage(e.target.value)}>
                      {STORAGE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="input-group full-width">
                    <label>Color</label>
                    <div className="color-options">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`color-chip ${color === c ? 'selected' : ''}`}
                          onClick={() => setColor(c)}
                        >
                          {c}
                        </button>
                      ))}
                      {!COLORS.includes(color) && (
                        <span className="custom-color-tag">{color}</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      placeholder="Or type a custom color..."
                      className="color-input"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="model-preview">
                  <span className="preview-label">Preview</span>
                  <div className="preview-card">
                    <div className="preview-brand" style={{ color: BRAND_COLORS[brand] || '#6366f1' }}>{brand}</div>
                    <div className="preview-name">{model || 'Model Name'}</div>
                    <div className="preview-specs">
                      <span>{ram}</span> · <span>{storage}</span> · <span>{color}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .catalog-page { display: flex; flex-direction: column; gap: 20px; }
        .page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .header-info { display: flex; align-items: center; gap: 16px; }
        .header-icon { width: 48px; height: 48px; border-radius: 14px; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        [data-theme="dark"] .header-icon { background: rgba(129,140,248,0.1); }
        .header-info h2 { font-size: 1.3rem; font-weight: 800; }
        .header-info p { font-size: 0.85rem; color: var(--text-muted); margin-top: 2px; }
        .add-btn { display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 12px; font-size: 0.9rem; }
        .stats-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .stat-pill { display: flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1px solid var(--border); padding: 8px 16px; border-radius: 999px; font-size: 0.8125rem; color: var(--text-muted); }
        .stat-pill svg { color: var(--primary); }
        .stat-pill strong { color: var(--foreground); }
        .search-bar { display: flex; align-items: center; gap: 10px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 12px 16px; }
        .search-bar:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); }
        .search-bar input { flex: 1; border: none; background: transparent; outline: none; font-size: 0.9rem; }
        .search-bar svg { color: var(--text-muted); flex-shrink: 0; }
        .clear-btn { color: var(--text-muted); font-size: 0.875rem; padding: 2px 4px; }
        .refresh-btn { padding: 6px; border-radius: 8px; color: var(--text-muted); transition: all 0.2s; }
        .refresh-btn:hover { color: var(--foreground); background: var(--bg-active); }
        .brands-list { display: flex; flex-direction: column; gap: 28px; }
        .brand-group { }
        .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .brand-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
        .brand-header h3 { font-size: 1rem; font-weight: 700; }
        .brand-count { font-size: 0.75rem; color: var(--text-muted); background: var(--bg-active); padding: 2px 10px; border-radius: 999px; font-weight: 600; }
        .models-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .model-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 10px; transition: all 0.2s; }
        .model-card:hover { border-color: var(--primary); box-shadow: 0 4px 20px var(--primary-glow); transform: translateY(-2px); }
        .model-card-top { display: flex; align-items: center; justify-content: space-between; }
        .model-brand-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
        .delete-btn { padding: 5px; border-radius: 8px; color: var(--text-muted); opacity: 0.4; transition: all 0.2s; }
        .delete-btn:hover:not(:disabled) { opacity: 1; color: var(--danger); background: var(--danger-light); }
        .delete-btn:disabled { opacity: 0.2; cursor: not-allowed; }
        .model-name { font-size: 0.95rem; font-weight: 700; }
        .model-specs { display: flex; flex-wrap: wrap; gap: 6px; }
        .spec-tag { font-size: 0.7rem; padding: 3px 8px; border-radius: 6px; background: var(--bg-active); color: var(--text-muted); font-weight: 600; }
        .color-tag { background: var(--secondary-light); color: var(--secondary); }
        [data-theme="dark"] .color-tag { background: rgba(56,189,248,0.1); }
        .model-stock { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; }
        .in-stock { color: var(--success); }
        .out-stock { color: var(--text-muted); }
        .spinner-center { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px; color: var(--text-muted); font-size: 0.875rem; }
        .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px 20px; text-align: center; background: var(--bg-card); border: 2px dashed var(--border); border-radius: 20px; }
        .empty-state svg { color: var(--text-muted); opacity: 0.4; }
        .empty-state h3 { font-size: 1.2rem; font-weight: 700; }
        .empty-state p { font-size: 0.875rem; color: var(--text-muted); max-width: 400px; line-height: 1.6; }
        .empty-state .btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; }
        /* Modal */
        .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-card { background: var(--bg-card); border: 1px solid var(--border); width: 100%; max-width: 520px; border-radius: 20px; box-shadow: var(--shadow-lg); overflow: hidden; max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--bg-card); z-index: 1; }
        .modal-title { display: flex; align-items: center; gap: 10px; }
        .modal-title h3 { font-size: 1rem; font-weight: 700; }
        .modal-icon { color: var(--primary); }
        .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .modal-hint { font-size: 0.8125rem; color: var(--text-muted); background: var(--bg-active); padding: 12px 14px; border-radius: 10px; line-height: 1.5; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .full-width { grid-column: 1 / -1; }
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-group label { font-size: 0.8125rem; font-weight: 600; }
        .req { color: var(--danger); }
        .input-group input, .input-group select { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--background); font-size: 0.875rem; outline: none; }
        .input-group input:focus, .input-group select:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
        .color-options { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .color-chip { padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; border: 2px solid var(--border); background: var(--background); transition: all 0.15s; }
        .color-chip.selected { border-color: var(--primary); background: var(--primary-light); color: var(--primary); }
        [data-theme="dark"] .color-chip.selected { background: rgba(129,140,248,0.1); }
        .color-chip:hover:not(.selected) { background: var(--bg-active); }
        .custom-color-tag { padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; border: 2px solid var(--primary); background: var(--primary-light); color: var(--primary); }
        .color-input { width: 100%; }
        .model-preview { }
        .preview-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px; }
        .preview-card { background: var(--bg-active); border-radius: 12px; padding: 16px; border: 1px solid var(--border); }
        .preview-brand { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .preview-name { font-size: 1.1rem; font-weight: 700; margin: 4px 0; }
        .preview-specs { font-size: 0.8125rem; color: var(--text-muted); }
        .modal-footer { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; position: sticky; bottom: 0; background: var(--bg-card); }
        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
