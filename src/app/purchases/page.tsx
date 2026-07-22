'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ShoppingCart, Plus, ScanLine, X, FileText, Truck, BookOpen, ChevronDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import MobileScanner from '@/components/MobileScanner';
import Link from 'next/link';

interface Supplier { id: string; name: string; phone: string; balance: number; }
interface CatalogModel {
  id: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  color: string;
}
interface PurchaseInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  supplier: { name: string };
  totalAmount: number;
  notes: string | null;
  _count: { tablets: number };
}

interface TabletEntry {
  catalogModelId: string; // If selected from catalog
  imei: string;
  serialNumber: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  color: string;
  purchasePrice: string;
  quantity: string;
}

function createBlankTablet(): TabletEntry {
  return { catalogModelId: '', imei: '', serialNumber: '', brand: 'Samsung', model: '', ram: '4GB', storage: '64GB', color: 'Black', purchasePrice: '', quantity: '1' };
}

export default function PurchasesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalogModels, setCatalogModels] = useState<CatalogModel[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'new' | 'history'>('new');
  const [showScanner, setShowScanner] = useState(false);
  const [scanTargetIdx, setScanTargetIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [tax, setTax] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [freight, setFreight] = useState('0');
  const [extraCharges, setExtraCharges] = useState('0');
  const [notes, setNotes] = useState('');
  const [tablets, setTablets] = useState<TabletEntry[]>([createBlankTablet()]);

  const addToast = (text: string, type: 'success' | 'warning' | 'error') => {
    setToasts(prev => [...prev, { id: Math.random().toString(), text, type }]);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [supRes, invRes, catRes] = await Promise.all([
        fetch('/api/suppliers'),
        fetch('/api/purchases'),
        fetch('/api/catalog')
      ]);
      if (supRes.ok) setSuppliers((await supRes.json()).suppliers || []);
      if (invRes.ok) setInvoices((await invRes.json()).invoices || []);
      if (catRes.ok) setCatalogModels((await catRes.json()).models || []);
    } catch { addToast('Failed to load data.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const addTabletRow = () => setTablets(prev => [...prev, createBlankTablet()]);

  const updateTablet = (idx: number, field: keyof TabletEntry, value: string) => {
    setTablets(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  // When a catalog model is selected, auto-fill all model fields
  const selectCatalogModel = (idx: number, modelId: string) => {
    const found = catalogModels.find(m => m.id === modelId);
    if (!found) {
      updateTablet(idx, 'catalogModelId', '');
      return;
    }
    setTablets(prev => prev.map((t, i) =>
      i === idx ? {
        ...t,
        catalogModelId: modelId,
        brand: found.brand,
        model: found.model,
        ram: found.ram,
        storage: found.storage,
        color: found.color,
      } : t
    ));
  };

  const removeTablet = (idx: number) => {
    if (tablets.length === 1) return;
    setTablets(prev => prev.filter((_, i) => i !== idx));
  };

  const openScannerFor = (idx: number) => {
    setScanTargetIdx(idx);
    setShowScanner(true);
  };

  const handleScanResult = (code: string) => {
    if (scanTargetIdx !== null) {
      updateTablet(scanTargetIdx, 'imei', code);
    }
    setShowScanner(false);
    setScanTargetIdx(null);
    addToast(`Scanned IMEI: ${code}`, 'success');
  };

  const subtotal = tablets.reduce((s, t) => s + (parseFloat(t.purchasePrice) || 0), 0);
  const totalAmount = subtotal + (parseFloat(tax) || 0) + (parseFloat(freight) || 0) + (parseFloat(extraCharges) || 0) - (parseFloat(discount) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) { addToast('Please select a supplier.', 'warning'); return; }

    const invalidTablets = tablets.filter(t => !t.model.trim() || !parseFloat(t.purchasePrice) || !parseInt(t.quantity) || parseInt(t.quantity) < 1);
    if (invalidTablets.length) { addToast('All rows must have model, purchase price, and a valid quantity.', 'warning'); return; }

    // Check duplicate IMEIs in the form (only for those that provided an IMEI)
    const providedImeis = tablets.filter(t => t.imei.trim()).map(t => t.imei.trim());
    if (new Set(providedImeis).size !== providedImeis.length) { addToast('Duplicate IMEIs detected in the list.', 'error'); return; }

    // Generate tablets based on quantity
    const finalTabletsToSubmit: any[] = [];
    tablets.forEach(t => {
      const qty = parseInt(t.quantity) || 1;
      for (let i = 0; i < qty; i++) {
        const generatedImei = (qty === 1 && t.imei.trim()) ? t.imei.trim() : `AUTO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        finalTabletsToSubmit.push({
            imei: generatedImei,
            serialNumber: (qty === 1 && t.serialNumber.trim()) ? t.serialNumber.trim() : null,
            brand: t.brand,
            model: t.model,
            ram: t.ram,
            storage: t.storage,
            color: t.color,
            purchasePrice: parseFloat(t.purchasePrice)
        });
      }
    });

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          invoiceRef,
          tax: parseFloat(tax) || 0,
          discount: parseFloat(discount) || 0,
          freight: parseFloat(freight) || 0,
          extraCharges: parseFloat(extraCharges) || 0,
          notes,
          tablets: finalTabletsToSubmit
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast(`✓ Purchase recorded! ${tablets.length} tablets added to warehouse. Invoice: ${data.invoiceNo}`, 'success');
        setTablets([createBlankTablet()]);
        setInvoiceRef(''); setNotes(''); setTax('0'); setDiscount('0'); setFreight('0'); setExtraCharges('0');
        loadData();
        setActiveView('history');
      } else {
        addToast(data.error || 'Failed to create purchase invoice.', 'error');
      }
    } catch { addToast('Network error.', 'error'); }
    finally { setSubmitting(false); }
  };

  // Group catalog by brand for the dropdown
  const catalogByBrand = catalogModels.reduce((acc: Record<string, CatalogModel[]>, m) => {
    if (!acc[m.brand]) acc[m.brand] = [];
    acc[m.brand].push(m);
    return acc;
  }, {});

  return (
    <div className="purchases-page">
      <ToastContainer toasts={toasts} onClose={id => setToasts(p => p.filter(t => t.id !== id))} />
      {showScanner && <MobileScanner onScan={handleScanResult} onClose={() => { setShowScanner(false); setScanTargetIdx(null); }} />}

      <div className="view-tabs">
        <button className={`view-tab ${activeView === 'new' ? 'active' : ''}`} onClick={() => setActiveView('new')}>
          <Plus size={16} /> New Purchase Entry
        </button>
        <button className={`view-tab ${activeView === 'history' ? 'active' : ''}`} onClick={() => setActiveView('history')}>
          <FileText size={16} /> Purchase History
        </button>
      </div>

      {/* Catalog hint banner */}
      {activeView === 'new' && catalogModels.length === 0 && (
        <div className="catalog-hint">
          <BookOpen size={18} />
          <div>
            <strong>Set up your Product Catalog first!</strong>
            <span> Add tablet models once in the catalog so you can select them quickly here without re-typing details.</span>
          </div>
          <Link href="/catalog" className="catalog-link">Go to Catalog →</Link>
        </div>
      )}

      {activeView === 'new' && (
        <form onSubmit={handleSubmit} className="purchase-form">
          {/* Invoice Header */}
          <div className="card header-card">
            <div className="header-row">
              <div className="input-group">
                <label><Truck size={14} /> Supplier</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} — {s.phone}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Supplier Invoice Ref # (Optional)</label>
                <input type="text" value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} placeholder="e.g. SUP-2024-001" />
              </div>
            </div>
            <div className="charges-row">
              <div className="input-group">
                <label>Tax (Rs.)</label>
                <input type="number" value={tax} onChange={e => setTax(e.target.value)} min="0" />
              </div>
              <div className="input-group">
                <label>Discount (Rs.)</label>
                <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} min="0" />
              </div>
              <div className="input-group">
                <label>Freight (Rs.)</label>
                <input type="number" value={freight} onChange={e => setFreight(e.target.value)} min="0" />
              </div>
              <div className="input-group">
                <label>Extra Charges (Rs.)</label>
                <input type="number" value={extraCharges} onChange={e => setExtraCharges(e.target.value)} min="0" />
              </div>
            </div>
            <div className="input-group">
              <label>Notes</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional information..." />
            </div>
          </div>

          {/* Tablets Entry Table */}
          <div className="card tablets-card">
            <div className="tablets-header">
              <div className="tablets-header-left">
                <h4>Tablet Entries</h4>
                <span className="entry-count">{tablets.length} item{tablets.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="tablets-header-right">
                {catalogModels.length > 0 && (
                  <span className="catalog-badge">
                    <BookOpen size={12} /> {catalogModels.length} models in catalog
                  </span>
                )}
                <button type="button" className="add-row-btn" onClick={addTabletRow}>
                  <Plus size={16} /> Add Row
                </button>
              </div>
            </div>

            <div className="tablets-scroll">
              <table className="entry-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>
                      <div className="th-with-icon">
                        <BookOpen size={12} />
                        <span>From Catalog</span>
                      </div>
                    </th>
                    <th>
                      <div className="th-with-icon">
                        <span>IMEI</span>
                        <span className="optional-text">(Optional)</span>
                      </div>
                    </th>
                    <th style={{ width: 80 }}>Qty <span className="req">*</span></th>
                    <th>Serial #</th>
                    <th>Brand <span className="req">*</span></th>
                    <th>Model <span className="req">*</span></th>
                    <th>RAM</th>
                    <th>Storage</th>
                    <th>Color</th>
                    <th>Purchase Price <span className="req">*</span></th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tablets.map((tab, idx) => (
                    <tr key={idx} className={tab.catalogModelId ? 'row-from-catalog' : ''}>
                      <td className="row-num">{idx + 1}</td>

                      {/* Catalog Model Selector */}
                      <td data-label="From Catalog">
                        <select
                          className={`catalog-select ${tab.catalogModelId ? 'selected' : ''}`}
                          value={tab.catalogModelId}
                          onChange={e => selectCatalogModel(idx, e.target.value)}
                        >
                          <option value="">— Select or type below —</option>
                          {Object.entries(catalogByBrand).map(([brandName, models]) => (
                            <optgroup key={brandName} label={brandName}>
                              {models.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.model} ({m.ram}/{m.storage}) {m.color}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>

                      {/* IMEI */}
                      <td data-label="IMEI (Optional)">
                        <div className="imei-cell">
                          <input
                            type="text"
                            value={tab.imei}
                            onChange={e => updateTablet(idx, 'imei', e.target.value)}
                            placeholder="Optional"
                            className="table-input imei-input"
                            disabled={parseInt(tab.quantity) > 1}
                            title={parseInt(tab.quantity) > 1 ? "IMEI is auto-generated when quantity > 1" : ""}
                          />
                          <button type="button" className="scan-cell-btn" onClick={() => openScannerFor(idx)} disabled={parseInt(tab.quantity) > 1} title="Scan IMEI">
                            <ScanLine size={14} />
                          </button>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td data-label="Qty *">
                        <input 
                          type="number" 
                          value={tab.quantity} 
                          onChange={e => updateTablet(idx, 'quantity', e.target.value)} 
                          min="1" 
                          className="table-input qty-input" 
                          required 
                        />
                      </td>

                      {/* Serial # */}
                      <td data-label="Serial #">
                        <input 
                          type="text" 
                          value={tab.serialNumber} 
                          onChange={e => updateTablet(idx, 'serialNumber', e.target.value)} 
                          placeholder="Optional" 
                          className="table-input sn-input" 
                          disabled={parseInt(tab.quantity) > 1}
                        />
                      </td>

                      {/* Brand — auto-filled if catalog selected, but still editable */}
                      <td data-label="Brand *">
                        <input
                          type="text"
                          value={tab.brand}
                          onChange={e => updateTablet(idx, 'brand', e.target.value)}
                          className={`table-input brand-input ${tab.catalogModelId ? 'auto-filled' : ''}`}
                          placeholder="Brand"
                          required
                        />
                      </td>

                      {/* Model */}
                      <td data-label="Model *">
                        <input
                          type="text"
                          value={tab.model}
                          onChange={e => updateTablet(idx, 'model', e.target.value)}
                          placeholder="e.g. Galaxy A55"
                          className={`table-input model-input ${tab.catalogModelId ? 'auto-filled' : ''}`}
                          required
                        />
                      </td>

                      {/* RAM */}
                      <td data-label="RAM">
                        <input
                          type="text"
                          value={tab.ram}
                          onChange={e => updateTablet(idx, 'ram', e.target.value)}
                          className={`table-input spec-input ${tab.catalogModelId ? 'auto-filled' : ''}`}
                          placeholder="4GB"
                        />
                      </td>

                      {/* Storage */}
                      <td data-label="Storage">
                        <input
                          type="text"
                          value={tab.storage}
                          onChange={e => updateTablet(idx, 'storage', e.target.value)}
                          className={`table-input spec-input ${tab.catalogModelId ? 'auto-filled' : ''}`}
                          placeholder="64GB"
                        />
                      </td>

                      {/* Color */}
                      <td data-label="Color">
                        <input
                          type="text"
                          value={tab.color}
                          onChange={e => updateTablet(idx, 'color', e.target.value)}
                          className={`table-input spec-input ${tab.catalogModelId ? 'auto-filled' : ''}`}
                          placeholder="Black"
                        />
                      </td>

                      {/* Purchase Price */}
                      <td data-label="Purchase Price *">
                        <div className="price-cell">
                          <span>Rs.</span>
                          <input
                            type="number"
                            value={tab.purchasePrice}
                            onChange={e => updateTablet(idx, 'purchasePrice', e.target.value)}
                            placeholder="0"
                            className="price-input"
                            required
                          />
                        </div>
                      </td>

                      {/* Remove */}
                      <td data-label="Actions">
                        <button type="button" className="remove-row-btn" onClick={() => removeTablet(idx)} disabled={tablets.length === 1}>
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-footer">
              <div className="totals">
                <div className="total-item">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                {(parseFloat(tax) || parseFloat(freight) || parseFloat(extraCharges) || parseFloat(discount)) ? (
                  <div className="total-item charges">
                    <span>+ Charges / − Discount</span>
                    <strong>{formatCurrency((parseFloat(tax) || 0) + (parseFloat(freight) || 0) + (parseFloat(extraCharges) || 0) - (parseFloat(discount) || 0))}</strong>
                  </div>
                ) : null}
                <div className="total-item grand">
                  <span>Grand Total</span>
                  <strong>{formatCurrency(totalAmount)}</strong>
                </div>
              </div>
              <button type="submit" className="btn-primary submit-btn" disabled={submitting}>
                <ShoppingCart size={18} />
                <span>{submitting ? 'Saving...' : `Record Purchase — ${tablets.length} Tablet${tablets.length !== 1 ? 's' : ''}`}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {activeView === 'history' && (
        <div className="card history-card">
          <h4>Purchase Invoice History</h4>
          {loading ? (
            <div className="spinner-center"><div className="spinner"></div></div>
          ) : (
            <div className="pos-table-container responsive-table-cards">
              <table className="pos-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Tablets</th>
                    <th>Total Amount</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length ? invoices.map(inv => (
                    <tr key={inv.id}>
                      <td data-label="Invoice #"><strong>{inv.invoiceNo}</strong></td>
                      <td data-label="Date">{formatDate(inv.date)}</td>
                      <td data-label="Supplier"><strong>{inv.supplier.name}</strong></td>
                      <td data-label="Tablets"><span className="badge badge-primary">{inv._count.tablets} pcs</span></td>
                      <td data-label="Total Amount"><strong>{formatCurrency(inv.totalAmount)}</strong></td>
                      <td data-label="Notes" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{inv.notes || '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No purchase invoices yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .purchases-page { display: flex; flex-direction: column; gap: 20px; }
        .view-tabs { display: flex; gap: 4px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 4px; width: fit-content; }
        .view-tab { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 10px; font-size: 0.875rem; font-weight: 600; color: var(--text-muted); transition: all 0.2s; }
        .view-tab.active { background: var(--primary); color: white; }
        .view-tab:hover:not(.active) { background: var(--bg-active); color: var(--foreground); }

        /* Catalog hint */
        .catalog-hint { display: flex; align-items: center; gap: 14px; background: var(--primary-light); border: 1px solid var(--primary); border-radius: 12px; padding: 14px 18px; font-size: 0.875rem; flex-wrap: wrap; gap: 12px; }
        [data-theme="dark"] .catalog-hint { background: rgba(129,140,248,0.08); }
        .catalog-hint svg { color: var(--primary); flex-shrink: 0; }
        .catalog-hint div { flex: 1; color: var(--text-muted); }
        .catalog-hint strong { color: var(--primary); }
        .catalog-link { padding: 7px 14px; background: var(--primary); color: white; border-radius: 8px; font-weight: 600; font-size: 0.8125rem; white-space: nowrap; }

        /* Form */
        .purchase-form { display: flex; flex-direction: column; gap: 16px; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; }
        .header-card { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .header-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .charges-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-group label { font-size: 0.8125rem; font-weight: 600; display: flex; align-items: center; gap: 5px; }
        .input-group input, .input-group select, .input-group textarea { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--background); font-size: 0.875rem; outline: none; }
        .input-group input:focus, .input-group select:focus, .input-group textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }

        /* Tablets card */
        .tablets-card { overflow: hidden; }
        .tablets-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
        .tablets-header-left { display: flex; align-items: center; gap: 10px; }
        .tablets-header-left h4 { font-size: 0.95rem; font-weight: 700; }
        .entry-count { font-size: 0.75rem; background: var(--primary-light); color: var(--primary); padding: 3px 10px; border-radius: 999px; font-weight: 700; }
        [data-theme="dark"] .entry-count { background: rgba(129,140,248,0.1); }
        .tablets-header-right { display: flex; align-items: center; gap: 10px; }
        .catalog-badge { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-active); padding: 5px 10px; border-radius: 8px; }
        .add-row-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; background: var(--primary); color: white; font-size: 0.8125rem; font-weight: 600; }

        /* Table */
        .tablets-scroll { overflow-x: auto; }
        .entry-table { width: 100%; border-collapse: collapse; }
        .entry-table th { padding: 10px 10px; background: var(--bg-active); font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
        .th-with-icon { display: flex; align-items: center; gap: 5px; }
        .req { color: var(--danger); }
        .entry-table td { padding: 7px 8px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .entry-table tr:last-child td { border-bottom: none; }
        .row-from-catalog { background: rgba(99, 102, 241, 0.02); }
        [data-theme="dark"] .row-from-catalog { background: rgba(129, 140, 248, 0.03); }
        .row-num { color: var(--text-muted); font-size: 0.75rem; text-align: center; }

        @media (max-width: 768px) {
          .purchases-page {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            min-width: 900px;
            padding-bottom: 20px;
          }
          .view-tabs {
            width: fit-content;
          }
        }

        /* Catalog select */
        .catalog-select { padding: 7px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--background); font-size: 0.8rem; outline: none; min-width: 180px; max-width: 220px; }
        .catalog-select.selected { border-color: var(--primary); background: var(--primary-light); color: var(--primary); font-weight: 600; }
        [data-theme="dark"] .catalog-select.selected { background: rgba(129,140,248,0.1); }
        .catalog-select:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }

        /* Table inputs */
        .table-input { padding: 7px 9px; border-radius: 8px; border: 1px solid var(--border); background: var(--background); font-size: 0.8rem; outline: none; }
        .table-input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
        .imei-input { width: 148px; font-family: monospace; font-size: 0.75rem; }
        .sn-input { width: 100px; }
        .brand-input { width: 90px; }
        .model-input { width: 130px; }
        .spec-input { width: 70px; text-align: center; }
        .auto-filled { border-color: var(--primary); background: var(--primary-light); color: var(--primary); font-weight: 600; }
        [data-theme="dark"] .auto-filled { background: rgba(129,140,248,0.08); }
        .imei-cell { display: flex; gap: 5px; align-items: center; }
        .scan-cell-btn { padding: 7px 9px; border-radius: 8px; background: var(--primary); color: white; flex-shrink: 0; }
        .price-cell { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; width: 120px; }
        .price-cell span { padding: 7px 7px; font-size: 0.7rem; background: var(--bg-active); border-right: 1px solid var(--border); color: var(--text-muted); }
        .price-input { border: none; background: transparent; padding: 7px 7px; flex: 1; min-width: 0; outline: none; font-size: 0.875rem; font-weight: 600; }
        .remove-row-btn { padding: 7px; border-radius: 8px; color: var(--danger); opacity: 0.4; }
        .remove-row-btn:hover { opacity: 1; background: var(--danger-light); }
        .remove-row-btn:disabled { opacity: 0.15; cursor: not-allowed; }

        /* Form footer */
        .form-footer { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 12px; }
        .totals { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
        .total-item { display: flex; flex-direction: column; }
        .total-item span { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
        .total-item strong { font-size: 0.95rem; font-weight: 700; }
        .total-item.grand strong { font-size: 1.15rem; color: var(--primary); }
        .submit-btn { display: flex; align-items: center; gap: 10px; padding: 13px 24px; border-radius: 12px; font-size: 0.9rem; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* History */
        .history-card { padding: 20px; }
        .history-card h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
        .spinner-center { display: flex; justify-content: center; padding: 40px; }
        .spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
