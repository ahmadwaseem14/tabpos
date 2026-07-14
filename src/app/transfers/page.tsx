'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Plus, Search, ScanLine, X, ChevronRight, Package, Check } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import MobileScanner from '@/components/MobileScanner';

interface Shopkeeper {
  id: string;
  shopName: string;
  name: string;
  isOwnShop: boolean;
}

interface Transfer {
  id: string;
  invoiceNo: string | null;
  date: string;
  fromLocation: string;
  toLocation: string;
  fromShopkeeper: { shopName: string } | null;
  toShopkeeper: { shopName: string } | null;
  _count: { items: number };
}

interface AvailableTablet {
  imei: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  color: string;
  qcStatus: string;
}

export default function TransfersPage() {
  const [shopkeepers, setShopkeepers] = useState<Shopkeeper[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Available tablets at the selected source
  const [availableTablets, setAvailableTablets] = useState<AvailableTablet[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  // Form state
  const [fromLocation, setFromLocation] = useState('WAREHOUSE');
  const [fromShopkeeperId, setFromShopkeeperId] = useState('');
  const [toLocation, setToLocation] = useState('SHOPKEEPER');
  const [toShopkeeperId, setToShopkeeperId] = useState('');
  const [imeiList, setImeiList] = useState<string[]>([]);
  const [ownerSellingPrice, setOwnerSellingPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search dropdown state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const addToast = (text: string, type: 'success' | 'warning' | 'error') => {
    setToasts(prev => [...prev, { id: Math.random().toString(), text, type }]);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [skRes, trRes] = await Promise.all([
        fetch('/api/shopkeepers'),
        fetch('/api/transfers')
      ]);
      if (skRes.ok) {
        const d = await skRes.json();
        setShopkeepers(d.shopkeepers || []);
      }
      if (trRes.ok) {
        const d = await trRes.json();
        setTransfers(d.transfers || []);
      }
    } catch {
      addToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available tablets at the selected source location
  const loadAvailableTablets = async () => {
    if (fromLocation === 'SHOPKEEPER' && !fromShopkeeperId) {
      setAvailableTablets([]);
      return;
    }
    setLoadingAvailable(true);
    try {
      const params = new URLSearchParams();
      params.set('status', 'AVAILABLE');
      params.set('location', fromLocation);
      if (fromShopkeeperId) {
        params.set('shopkeeperId', fromShopkeeperId);
      }
      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableTablets(data.tablets || []);
      }
    } catch (err) {
      console.error('Failed to load available tablets:', err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadAvailableTablets();
    setImeiList([]); // Clear selected list when source changes
  }, [fromLocation, fromShopkeeperId]);

  const selectTablet = (imei: string) => {
    if (imeiList.includes(imei)) {
      addToast('Tablet already in transfer list.', 'warning');
      return;
    }
    setImeiList(prev => [...prev, imei]);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleScanResult = (code: string) => {
    const cleaned = code.trim();
    const found = availableTablets.find(t => t.imei === cleaned);
    if (!found) {
      addToast(`IMEI ${cleaned} is not available at the selected source location.`, 'error');
      return;
    }
    if (imeiList.includes(cleaned)) {
      addToast('IMEI already in the list.', 'warning');
      return;
    }
    setImeiList(prev => [...prev, cleaned]);
    addToast(`Scanned and added: ${found.brand} ${found.model} (${cleaned})`, 'success');
    setShowScanner(false);
  };

  const removeImei = (imei: string) => {
    setImeiList(prev => prev.filter(i => i !== imei));
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imeiList.length) {
      addToast('Please select at least one tablet to transfer.', 'warning');
      return;
    }
    if ((toLocation === 'SHOPKEEPER' || toLocation === 'OWN_SHOP') && !toShopkeeperId) {
      addToast('Please select a destination shopkeeper.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromLocation,
          fromShopkeeperId: fromLocation !== 'WAREHOUSE' ? fromShopkeeperId : null,
          toLocation,
          toShopkeeperId: toLocation !== 'WAREHOUSE' ? toShopkeeperId : null,
          imeis: imeiList,
          ownerSellingPrice: ownerSellingPrice ? parseFloat(ownerSellingPrice) : null,
          notes
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast(`Transfer completed! ${imeiList.length} tablets moved.`, 'success');
        setImeiList([]);
        setOwnerSellingPrice('');
        setNotes('');
        loadData();
        loadAvailableTablets();
      } else {
        addToast(data.error || 'Transfer failed.', 'error');
      }
    } catch {
      addToast('Network error processing transfer.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getLocLabel = (loc: string, shopName?: string | null) => {
    if (loc === 'WAREHOUSE') return '🏭 Warehouse';
    if (loc === 'OWN_SHOP') return `🏪 ${shopName || 'Own Shop'}`;
    return `🏬 ${shopName || 'Shopkeeper'}`;
  };

  // Filter available tablets based on query input
  const filteredAvailable = availableTablets.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      t.imei.toLowerCase().includes(q) ||
      t.brand.toLowerCase().includes(q) ||
      t.model.toLowerCase().includes(q)
    );
  });

  return (
    <div className="transfers-page">
      <ToastContainer toasts={toasts} onClose={id => setToasts(p => p.filter(t => t.id !== id))} />
      {showScanner && <MobileScanner onScan={handleScanResult} onClose={() => setShowScanner(false)} />}

      <div className="transfers-layout">
        {/* Left: Transfer Form */}
        <div className="transfer-form-panel">
          <form onSubmit={handleSubmitTransfer} className="card transfer-form">
            <div className="form-header">
              <ArrowLeftRight size={20} className="form-icon" />
              <h3>New Stock Transfer</h3>
            </div>

            <div className="location-row">
              <div className="input-group">
                <label>From Location (Source)</label>
                <select value={fromLocation} onChange={e => { setFromLocation(e.target.value); setFromShopkeeperId(''); }}>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="SHOPKEEPER">Shopkeeper</option>
                  <option value="OWN_SHOP">Own Shop</option>
                </select>
              </div>
              {(fromLocation === 'SHOPKEEPER' || fromLocation === 'OWN_SHOP') && (
                <div className="input-group">
                  <label>Source Shopkeeper</label>
                  <select value={fromShopkeeperId} onChange={e => setFromShopkeeperId(e.target.value)} required>
                    <option value="">-- Select --</option>
                    {shopkeepers
                      .filter(sk => fromLocation === 'OWN_SHOP' ? sk.isOwnShop : !sk.isOwnShop)
                      .map(sk => (
                        <option key={sk.id} value={sk.id}>{sk.shopName}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="arrow-divider">
              <div className="arrow-line"></div>
              <ArrowLeftRight size={20} className="arrow-icon" />
              <div className="arrow-line"></div>
            </div>

            <div className="location-row">
              <div className="input-group">
                <label>To Location (Destination)</label>
                <select value={toLocation} onChange={e => { setToLocation(e.target.value); setToShopkeeperId(''); }}>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="SHOPKEEPER">Shopkeeper</option>
                  <option value="OWN_SHOP">Own Shop</option>
                </select>
              </div>
              {(toLocation === 'SHOPKEEPER' || toLocation === 'OWN_SHOP') && (
                <div className="input-group">
                  <label>Destination Shopkeeper</label>
                  <select value={toShopkeeperId} onChange={e => setToShopkeeperId(e.target.value)} required>
                    <option value="">-- Select --</option>
                    {shopkeepers
                      .filter(sk => toLocation === 'OWN_SHOP' ? sk.isOwnShop : true)
                      .map(sk => (
                        <option key={sk.id} value={sk.id}>{sk.shopName}{sk.isOwnShop ? ' (Own)' : ''}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Product Selector with Searchable Dropdown list */}
            <div className="imei-section">
              <label>Select Tablets to Transfer ({availableTablets.length} available)</label>
              
              <div className="searchable-dropdown-container">
                <div className="imei-input-row">
                  <div className="search-input-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder={loadingAvailable ? "Loading available stock..." : "Search model, brand or IMEI..."}
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      disabled={loadingAvailable}
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery('')} className="clear-search">✕</button>
                    )}
                  </div>
                  <button type="button" className="scan-imei-btn" onClick={() => setShowScanner(true)} title="Scan device barcode">
                    <ScanLine size={18} />
                  </button>
                </div>

                {isDropdownOpen && (
                  <div className="dropdown-overlay" onClick={() => setIsDropdownOpen(false)} />
                )}

                {isDropdownOpen && (
                  <div className="dropdown-list-card">
                    {loadingAvailable ? (
                      <div className="dropdown-loading">Fetching available items...</div>
                    ) : filteredAvailable.length > 0 ? (
                      filteredAvailable.map(tab => {
                        const isAdded = imeiList.includes(tab.imei);
                        return (
                          <div 
                            key={tab.imei} 
                            className={`dropdown-item ${isAdded ? 'added' : ''}`}
                            onClick={() => !isAdded && selectTablet(tab.imei)}
                          >
                            <div className="item-info">
                              <strong>{tab.brand} {tab.model}</strong>
                              <span>{tab.ram} RAM / {tab.storage} Storage • Color: {tab.color}</span>
                              <small className="imei-sub text-muted">IMEI: {tab.imei}</small>
                            </div>
                            {isAdded ? (
                              <span className="added-badge"><Check size={14} /> Added</span>
                            ) : (
                              <button type="button" className="add-item-btn">Select</button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="dropdown-empty">No matching tablets available here.</div>
                    )}
                  </div>
                )}
              </div>

              {imeiList.length > 0 && (
                <div className="imei-chips">
                  {imeiList.map(imei => {
                    const tabDetail = availableTablets.find(t => t.imei === imei);
                    return (
                      <div key={imei} className="imei-chip">
                        <div className="chip-details">
                          <strong>{tabDetail ? `${tabDetail.brand} ${tabDetail.model}` : 'Tablet'}</strong>
                          <span>{imei}</span>
                        </div>
                        <button type="button" onClick={() => removeImei(imei)}>
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {imeiList.length > 0 && (
                <div className="imei-count-badge">
                  <Package size={14} />
                  <span>{imeiList.length} tablet{imeiList.length !== 1 ? 's' : ''} queued for transfer</span>
                </div>
              )}
            </div>

            <div className="input-group">
              <label>Owner Selling Price (PKR) — Optional</label>
              <input
                type="number"
                placeholder="Set/update selling price for these tablets"
                value={ownerSellingPrice}
                onChange={e => setOwnerSellingPrice(e.target.value)}
              />
              <small className="help-text">If set, this becomes the price owner charges shopkeeper per tablet.</small>
            </div>

            <div className="input-group">
              <label>Notes</label>
              <textarea rows={2} placeholder="Any transfer notes or delivery details..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <button type="submit" className="btn-primary submit-btn" disabled={submitting || !imeiList.length}>
              {submitting ? <div className="btn-spinner"></div> : <ArrowLeftRight size={18} />}
              <span>{submitting ? 'Processing...' : `Transfer ${imeiList.length || 0} Tablet${imeiList.length !== 1 ? 's' : ''}`}</span>
            </button>
          </form>
        </div>

        {/* Right: Transfer History */}
        <div className="transfer-history-panel">
          <div className="card history-card">
            <h4>Transfer History</h4>
            {loading ? (
              <div className="spinner-center"><div className="spinner"></div></div>
            ) : transfers.length ? (
              <div className="history-list">
                {transfers.map(tr => (
                  <div key={tr.id} className="history-row">
                    <div className="history-route">
                      <span className="from-label">{getLocLabel(tr.fromLocation, tr.fromShopkeeper?.shopName)}</span>
                      <ChevronRight size={16} className="route-arrow" />
                      <span className="to-label">{getLocLabel(tr.toLocation, tr.toShopkeeper?.shopName)}</span>
                    </div>
                    <div className="history-meta">
                      <span className="badge badge-primary">{tr._count.items} tablets</span>
                      <span className="history-date">{formatDate(tr.date)}</span>
                      {tr.invoiceNo && <span className="invoice-ref">{tr.invoiceNo}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-history">
                <ArrowLeftRight size={32} />
                <p>No transfers recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .transfers-page { display: flex; flex-direction: column; height: 100%; }
        .transfers-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; }
        .transfer-form { padding: 24px; display: flex; flex-direction: column; gap: 18px; }
        .form-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .form-header h3 { font-size: 1.05rem; font-weight: 700; }
        .form-icon { color: var(--primary); }
        .location-row { display: flex; flex-direction: column; gap: 12px; }
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-group label { font-size: 0.8125rem; font-weight: 600; color: var(--foreground); }
        .input-group input, .input-group select, .input-group textarea { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--background); font-size: 0.875rem; outline: none; }
        .input-group input:focus, .input-group select:focus, .input-group textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
        .help-text { font-size: 0.75rem; color: var(--text-muted); }
        .arrow-divider { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
        .arrow-line { flex: 1; height: 1px; background: var(--border); }
        .arrow-icon { color: var(--primary); }

        .imei-section { display: flex; flex-direction: column; gap: 10px; position: relative; }
        .imei-section > label { font-size: 0.8125rem; font-weight: 600; }
        .searchable-dropdown-container { position: relative; width: 100%; }
        .imei-input-row { display: flex; gap: 8px; width: 100%; }
        .search-input-wrapper { display: flex; align-items: center; gap: 8px; background: var(--background); border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; flex: 1; position: relative; }
        .search-icon { color: var(--text-muted); }
        .search-input-wrapper input { border: none; background: transparent; padding: 10px 0; flex: 1; outline: none; font-size: 0.875rem; }
        .clear-search { color: var(--text-muted); font-size: 0.875rem; }
        .scan-imei-btn { padding: 10px; border-radius: 10px; background: var(--primary); color: white; flex-shrink: 0; }
        
        .dropdown-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10; }
        .dropdown-list-card { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 20; max-height: 250px; overflow-y: auto; margin-top: 4px; }
        .dropdown-item { padding: 10px 14px; border-bottom: 1px dashed var(--border); display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.2s; }
        .dropdown-item:last-child { border-bottom: none; }
        .dropdown-item:hover:not(.added) { background: var(--bg-active); }
        .dropdown-item.added { cursor: not-allowed; background: rgba(99, 102, 241, 0.03); }
        .item-info { display: flex; flex-direction: column; gap: 2px; }
        .item-info strong { font-size: 0.85rem; }
        .item-info span { font-size: 0.75rem; color: var(--text-muted); }
        .imei-sub { font-family: monospace; font-size: 0.72rem; }
        .add-item-btn { font-size: 0.75rem; font-weight: 600; color: var(--primary); background: var(--primary-light); padding: 4px 8px; border-radius: 6px; }
        .added-badge { font-size: 0.75rem; font-weight: 600; color: var(--success); display: flex; align-items: center; gap: 4px; }
        .dropdown-empty { padding: 16px; text-align: center; font-size: 0.8125rem; color: var(--text-muted); }
        .dropdown-loading { padding: 16px; text-align: center; font-size: 0.8125rem; color: var(--text-muted); }

        .imei-chips { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; max-height: 200px; overflow-y: auto; }
        .imei-chip { display: flex; align-items: center; justify-content: space-between; background: var(--bg-active); border: 1px solid var(--border); padding: 8px 12px; border-radius: 10px; }
        .chip-details { display: flex; flex-direction: column; gap: 2px; }
        .chip-details strong { font-size: 0.8125rem; }
        .chip-details span { font-family: monospace; font-size: 0.75rem; color: var(--text-muted); }
        .imei-chip button { color: var(--danger); opacity: 0.6; padding: 4px; border-radius: 6px; }
        .imei-chip button:hover { opacity: 1; background: var(--danger-light); }
        .imei-count-badge { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
        
        .submit-btn { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; font-size: 1rem; border-radius: 12px; margin-top: 4px; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .history-card { padding: 20px; }
        .history-card h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
        .history-list { display: flex; flex-direction: column; gap: 12px; max-height: 600px; overflow-y: auto; }
        .history-row { padding: 12px; background: var(--background); border: 1px solid var(--border); border-radius: 12px; display: flex; flex-direction: column; gap: 8px; }
        .history-route { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 600; }
        .from-label { color: var(--text-muted); }
        .route-arrow { color: var(--primary); flex-shrink: 0; }
        .to-label { color: var(--foreground); }
        .history-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .history-date { font-size: 0.75rem; color: var(--text-muted); }
        .invoice-ref { font-size: 0.7rem; font-family: monospace; background: var(--bg-active); padding: 2px 6px; border-radius: 4px; color: var(--text-muted); }
        .no-history { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; gap: 10px; color: var(--text-muted); }
        .no-history p { font-size: 0.875rem; }
        .spinner-center { display: flex; align-items: center; justify-content: center; padding: 40px; }
        .spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @media (max-width: 768px) { .transfers-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
