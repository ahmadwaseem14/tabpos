'use client';

import React, { useEffect, useState } from 'react';
import { Receipt, Plus, ScanLine, X, Percent, DollarSign, User, Search, Check } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import MobileScanner from '@/components/MobileScanner';

interface Shopkeeper {
  id: string;
  shopName: string;
  name: string;
  balance: number;
  creditLimit: number;
  isOwnShop: boolean;
}

interface TabletForSale {
  imei: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  color: string;
  purchasePrice: number;
  sellingPrice: number | null;
  locationType: string;
  qcStatus: string;
  status: string;
}

interface SaleItem {
  imei: string;
  brand: string;
  model: string;
  purchasePrice: number;
  sellingPrice: string; // editable field
}

interface SaleInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  shopkeeper: { shopName: string; isOwnShop: boolean };
  totalAmount: number;
  paymentReceived: number;
  paymentMethod: string;
  _count: { tablets: number };
}

export default function SalesPage() {
  const [shopkeepers, setShopkeepers] = useState<Shopkeeper[]>([]);
  const [invoices, setInvoices] = useState<SaleInvoice[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'new' | 'history'>('new');

  // Form state
  const [selectedShopkeeperId, setSelectedShopkeeperId] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [paymentReceived, setPaymentReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lookingUpImei, setLookingUpImei] = useState(false);

  // Search dropdown state
  const [availableTablets, setAvailableTablets] = useState<TabletForSale[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const addToast = (text: string, type: 'success' | 'warning' | 'error') => {
    setToasts(prev => [...prev, { id: Math.random().toString(), text, type }]);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [skRes, invRes] = await Promise.all([
        fetch('/api/shopkeepers'),
        fetch('/api/sales')
      ]);
      if (skRes.ok) setShopkeepers((await skRes.json()).shopkeepers || []);
      if (invRes.ok) setInvoices((await invRes.json()).invoices || []);
    } catch {
      addToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTablets = async (shopkeeperId?: string) => {
    setLoadingAvailable(true);
    try {
      // If a shopkeeper is selected, show only stock at their location.
      // Otherwise show all available warehouse stock.
      const params = shopkeeperId
        ? `/api/inventory?status=AVAILABLE&shopkeeperId=${shopkeeperId}`
        : '/api/inventory?status=AVAILABLE';
      const res = await fetch(params);
      if (res.ok) {
        const data = await res.json();
        // Only include tablets that passed QC
        setAvailableTablets((data.tablets || []).filter((t: any) => t.qcStatus === 'CHECKED_OK'));
      }
    } catch (err) {
      console.error('Failed to load available tablets:', err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => { loadData(); loadAvailableTablets(); }, []);

  // When shopkeeper changes, reload stock filtered to their location
  useEffect(() => {
    setSaleItems([]);
    setSearchQuery('');
    setIsDropdownOpen(false);
    if (selectedShopkeeperId) {
      loadAvailableTablets(selectedShopkeeperId);
    } else {
      loadAvailableTablets();
    }
  }, [selectedShopkeeperId]);

  // Lookup tablet by IMEI and add to sale list (fallback for scanner or manual entry)
  const lookupAndAddImei = async (imei: string) => {
    const cleaned = imei.trim();
    if (!cleaned) return;
    if (saleItems.find(i => i.imei === cleaned)) {
      addToast('Tablet already in this invoice.', 'warning');
      return;
    }

    setLookingUpImei(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(cleaned)}`);
      if (res.ok) {
        const data = await res.json();
        // Find matching exact IMEI in results
        let found: any = null;
        for (const result of data.results || []) {
          for (const loc of result.locations || []) {
            const inst = loc.instances.find((i: any) => i.imei === cleaned);
            if (inst) {
              found = { ...inst, brand: result.brand, model: result.model, ram: result.ram, storage: result.storage };
              break;
            }
          }
          if (found) break;
        }

        if (!found) {
          addToast(`IMEI ${cleaned} not found in inventory.`, 'error');
        } else if (found.status !== 'AVAILABLE') {
          addToast(`IMEI ${cleaned} is not available (status: ${found.status}).`, 'error');
        } else if (found.qcStatus !== 'CHECKED_OK') {
          addToast(`Tablet ${cleaned} has not passed QC. Only CHECKED_OK tablets can be sold.`, 'warning');
        } else {
          setSaleItems(prev => [...prev, {
            imei: cleaned,
            brand: found.brand,
            model: found.model,
            purchasePrice: found.purchasePrice,
            sellingPrice: found.sellingPrice ? found.sellingPrice.toString() : '',
          }]);
          addToast(`Added: ${found.brand} ${found.model}`, 'success');
        }
      }
    } catch {
      addToast('Error looking up tablet.', 'error');
    } finally {
      setLookingUpImei(false);
    }
  };

  const selectTablet = (imei: string) => {
    const cleaned = imei.trim();
    if (!cleaned) return;
    if (saleItems.find(i => i.imei === cleaned)) {
      addToast('Tablet already in this invoice.', 'warning');
      return;
    }
    
    const found = availableTablets.find(t => t.imei === cleaned);
    if (found) {
       setSaleItems(prev => [...prev, {
            imei: cleaned,
            brand: found.brand,
            model: found.model,
            purchasePrice: found.purchasePrice,
            sellingPrice: found.sellingPrice ? found.sellingPrice.toString() : '',
       }]);
       addToast(`Added: ${found.brand} ${found.model}`, 'success');
       setSearchQuery('');
       setIsDropdownOpen(false);
    } else {
       lookupAndAddImei(cleaned); 
    }
  };

  const handleScanResult = (code: string) => {
    setShowScanner(false);
    selectTablet(code);
  };

  const updateSellPrice = (imei: string, price: string) => {
    setSaleItems(prev => prev.map(item => item.imei === imei ? { ...item, sellingPrice: price } : item));
  };

  const removeSaleItem = (imei: string) => {
    setSaleItems(prev => prev.filter(i => i.imei !== imei));
  };

  // Calculations
  const subtotal = saleItems.reduce((sum, i) => sum + (parseFloat(i.sellingPrice) || 0), 0);
  const discountVal = parseFloat(discount) || 0;
  const taxVal = parseFloat(tax) || 0;
  const totalAmount = subtotal + taxVal - discountVal;
  const totalCost = saleItems.reduce((sum, i) => sum + i.purchasePrice, 0);
  const estimatedProfit = subtotal - totalCost - discountVal;
  const paymentReceivedVal = parseFloat(paymentReceived) || 0;
  const balanceRemaining = totalAmount - paymentReceivedVal;

  const selectedShopkeeper = shopkeepers.find(sk => sk.id === selectedShopkeeperId);

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopkeeperId) { addToast('Please select a shopkeeper.', 'warning'); return; }
    if (!saleItems.length) { addToast('Please add at least one tablet.', 'warning'); return; }
    const invalidItems = saleItems.filter(i => !parseFloat(i.sellingPrice) || parseFloat(i.sellingPrice) <= 0);
    if (invalidItems.length) { addToast('All tablets must have a selling price greater than zero.', 'warning'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperId: selectedShopkeeperId,
          tax: taxVal,
          discount: discountVal,
          paymentReceived: paymentReceivedVal,
          paymentMethod,
          notes,
          tablets: saleItems.map(i => ({ imei: i.imei, sellingPrice: parseFloat(i.sellingPrice) }))
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast(`Sale Invoice created! Total: ${formatCurrency(totalAmount)}`, 'success');
        setSaleItems([]);
        setDiscount('0');
        setTax('0');
        setPaymentReceived('');
        setNotes('');
        loadData();
        loadAvailableTablets(selectedShopkeeperId || undefined);
        setActiveView('history');
      } else {
        addToast(data.error || 'Failed to create sale invoice.', 'error');
      }
    } catch {
      addToast('Network error creating sale.', 'error');
    } finally {
      setSubmitting(false);
    }
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
    <div className="sales-page">
      <ToastContainer toasts={toasts} onClose={id => setToasts(p => p.filter(t => t.id !== id))} />
      {showScanner && <MobileScanner onScan={handleScanResult} onClose={() => setShowScanner(false)} />}

      <div className="view-tabs">
        <button className={`view-tab ${activeView === 'new' ? 'active' : ''}`} onClick={() => setActiveView('new')}>
          <Plus size={16} /> New Sale Invoice
        </button>
        <button className={`view-tab ${activeView === 'history' ? 'active' : ''}`} onClick={() => setActiveView('history')}>
          <Receipt size={16} /> Invoice History
        </button>
      </div>

      {activeView === 'new' && (
        <div className="pos-layout">
          {/* Left: Item Builder */}
          <div className="pos-builder">
            <div className="card pos-card">
              <div className="card-section">
                <label className="section-label">Customer / Shopkeeper</label>
                <select className="shopkeeper-select" value={selectedShopkeeperId} onChange={e => { setSelectedShopkeeperId(e.target.value); }}>
                  <option value="">-- Select Shopkeeper --</option>
                  {shopkeepers.map(sk => (
                    <option key={sk.id} value={sk.id}>{sk.shopName}{sk.isOwnShop ? ' (Own Shop)' : ''}</option>
                  ))}
                </select>
                {selectedShopkeeper && !selectedShopkeeper.isOwnShop && (
                  <div className="credit-status">
                    <User size={14} />
                    <span>Balance: <strong className={selectedShopkeeper.balance > 0 ? 'text-warning' : ''}>{formatCurrency(selectedShopkeeper.balance)}</strong></span>
                    <span>Limit: <strong>{formatCurrency(selectedShopkeeper.creditLimit)}</strong></span>
                  </div>
                )}
              </div>

              {/* Product Selector with Searchable Dropdown list */}
              <div className="card-section" style={{ position: 'relative', zIndex: 5 }}>
                <label className="section-label">
                  {selectedShopkeeperId
                    ? `Tablets at ${selectedShopkeeper?.shopName || 'this shop'} (${availableTablets.length})`
                    : `Add Tablets to Sale — Select a shopkeeper first`
                  }
                </label>
                
                <div className="searchable-dropdown-container">
                  <div className="imei-input-row">
                    <div className="search-input-wrapper">
                      <Search size={16} className="search-icon" />
                      <input
                        type="text"
                        placeholder={loadingAvailable ? 'Loading stock...' : selectedShopkeeperId ? `Search ${availableTablets.length} tablets at this shopkeeper...` : 'Select a shopkeeper first to see their stock...'}
                        value={searchQuery}
                        onChange={e => {
                          setSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        onKeyDown={e => { 
                          if (e.key === 'Enter') { 
                            e.preventDefault(); 
                            if(searchQuery.trim().length >= 14) selectTablet(searchQuery);
                          } 
                        }}
                        disabled={loadingAvailable || lookingUpImei}
                      />
                      {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} className="clear-search">✕</button>
                      )}
                    </div>
                    <button type="button" className="scan-btn" onClick={() => setShowScanner(true)} title="Scan device barcode">
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
                          const isAdded = saleItems.some(i => i.imei === tab.imei);
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
                        <div className="dropdown-empty">
                          No matching tablets available here. 
                          <br/><br/>
                          <button type="button" className="btn-secondary btn-sm" onClick={() => {selectTablet(searchQuery)}}>
                            Try Manual Lookup
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              {saleItems.length > 0 && (
                <div className="card-section">
                  <table className="sale-items-table">
                    <thead>
                      <tr>
                        <th>Tablet</th>
                        <th>Cost</th>
                        <th>Sell Price</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleItems.map(item => (
                        <tr key={item.imei}>
                          <td data-label="Tablet">
                            <strong>{item.brand} {item.model}</strong>
                            <div className="sub-text" style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{item.imei}</div>
                          </td>
                          <td data-label="Cost" className="cost-cell">{formatCurrency(item.purchasePrice)}</td>
                          <td data-label="Sell Price">
                            <div className="price-cell">
                              <span>Rs.</span>
                              <input
                                type="number"
                                value={item.sellingPrice}
                                onChange={e => updateSellPrice(item.imei, e.target.value)}
                                placeholder="Price"
                                className="price-input"
                              />
                            </div>
                          </td>
                          <td data-label="Actions">
                            <button onClick={() => removeSaleItem(item.imei)} className="remove-btn">
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: Summary & Payment */}
          <div className="pos-summary-panel">
            <form onSubmit={handleSubmitSale} className="card summary-card">
              <h4>Invoice Summary</h4>

              <div className="summary-rows">
                <div className="summary-row">
                  <span>Subtotal ({saleItems.length} item{saleItems.length !== 1 ? 's' : ''})</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div className="summary-row">
                  <span>Discount</span>
                  <div className="inline-input">
                    <span>Rs.</span>
                    <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} min="0" />
                  </div>
                </div>
                <div className="summary-row">
                  <span>Tax</span>
                  <div className="inline-input">
                    <span>Rs.</span>
                    <input type="number" value={tax} onChange={e => setTax(e.target.value)} min="0" />
                  </div>
                </div>
                <div className="summary-row total-row">
                  <span>Total Amount</span>
                  <strong className="total-amount">{formatCurrency(totalAmount)}</strong>
                </div>
                <div className="summary-row profit-row">
                  <span>Est. Profit</span>
                  <strong className="profit-amount">{formatCurrency(estimatedProfit)}</strong>
                </div>
              </div>

              <div className="payment-section">
                <label className="section-label">Payment Received Now</label>
                <div className="payment-input-wrapper">
                  <span>Rs.</span>
                  <input
                    type="number"
                    value={paymentReceived}
                    onChange={e => setPaymentReceived(e.target.value)}
                    placeholder="0"
                    max={totalAmount}
                  />
                </div>
                <div className="balance-display">
                  <span>Balance Remaining:</span>
                  <strong className={balanceRemaining > 0 ? 'text-warning' : 'text-success'}>{formatCurrency(balanceRemaining)}</strong>
                </div>

                <label className="section-label">Payment Method</label>
                <div className="method-grid">
                  {['CASH', 'BANK', 'EASYPAISA', 'JAZZCASH', 'CHEQUE'].map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`method-btn ${paymentMethod === m ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <label className="section-label">Notes</label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Invoice notes..." />
              </div>

              <button type="submit" className="btn-primary submit-invoice-btn" disabled={submitting || !saleItems.length || !selectedShopkeeperId}>
                {submitting ? 'Creating Invoice...' : `Create Sale Invoice — ${formatCurrency(totalAmount)}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeView === 'history' && (
        <div className="card invoice-history-card">
          <h4>Sales Invoice History</h4>
          {loading ? (
            <div className="spinner-center"><div className="spinner"></div></div>
          ) : (
            <div className="pos-table-container responsive-table-cards">
              <table className="pos-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length ? invoices.map(inv => (
                    <tr key={inv.id}>
                      <td data-label="Invoice #"><strong>{inv.invoiceNo}</strong></td>
                      <td data-label="Date">{formatDate(inv.date)}</td>
                      <td data-label="Customer">
                        {inv.shopkeeper.shopName}
                        {inv.shopkeeper.isOwnShop && <span className="badge badge-primary" style={{ fontSize: '0.65rem', marginLeft: '6px' }}>Own</span>}
                      </td>
                      <td data-label="Items">{inv._count.tablets} tablets</td>
                      <td data-label="Total"><strong>{formatCurrency(inv.totalAmount)}</strong></td>
                      <td data-label="Paid" className="text-success">{formatCurrency(inv.paymentReceived)}</td>
                      <td data-label="Balance" className={inv.totalAmount - inv.paymentReceived > 0 ? 'text-warning font-bold' : 'text-success'}>{formatCurrency(inv.totalAmount - inv.paymentReceived)}</td>
                      <td data-label="Method"><span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{inv.paymentMethod}</span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No sales invoices recorded yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .sales-page { display: flex; flex-direction: column; gap: 20px; }
        .view-tabs { display: flex; gap: 4px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 4px; width: fit-content; }
        .view-tab { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 10px; font-size: 0.875rem; font-weight: 600; color: var(--text-muted); transition: all 0.2s; }
        .view-tab.active { background: var(--primary); color: white; }
        .view-tab:hover:not(.active) { background: var(--bg-active); color: var(--foreground); }
        .pos-layout { display: grid; grid-template-columns: 1fr 360px; gap: 20px; align-items: start; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; }
        .pos-card { display: flex; flex-direction: column; }
        .card-section { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
        .card-section:last-child { border-bottom: none; }
        .section-label { font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .shopkeeper-select { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--background); font-size: 0.875rem; outline: none; width: 100%; }
        .shopkeeper-select:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
        .credit-status { display: flex; align-items: center; gap: 12px; font-size: 0.8125rem; background: var(--bg-active); padding: 8px 12px; border-radius: 8px; }
        .text-warning { color: var(--warning); }
        .text-success { color: var(--success); }
        .font-bold { font-weight: 700; }
        
        .searchable-dropdown-container { position: relative; width: 100%; }
        .imei-input-row { display: flex; gap: 8px; width: 100%; }
        .search-input-wrapper { display: flex; align-items: center; gap: 8px; background: var(--background); border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; flex: 1; position: relative; }
        .search-icon { color: var(--text-muted); }
        .search-input-wrapper input { border: none; background: transparent; padding: 10px 0; flex: 1; outline: none; font-size: 0.875rem; }
        .clear-search { color: var(--text-muted); font-size: 0.875rem; }
        .scan-btn { padding: 10px; border-radius: 10px; background: var(--primary); color: white; flex-shrink: 0; }
        
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
        
        .btn-sm { padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; }

        .sale-items-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .sale-items-table th { padding: 8px 10px; text-align: left; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border); }
        .sale-items-table td { padding: 10px; border-bottom: 1px dashed var(--border); vertical-align: middle; }
        .sale-items-table tr:last-child td { border-bottom: none; }
        .sub-text { color: var(--text-muted); }
        .cost-cell { color: var(--text-muted); font-size: 0.75rem; }
        .price-cell { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--background); }
        .price-cell span { padding: 6px 8px; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-active); border-right: 1px solid var(--border); }
        .price-input { border: none; background: transparent; padding: 6px 8px; flex: 1; min-width: 0; outline: none; font-size: 0.875rem; font-weight: 600; }
        .remove-btn { color: var(--danger); opacity: 0.5; padding: 4px; border-radius: 6px; }
        .remove-btn:hover { opacity: 1; background: var(--danger-light); }

        @media (max-width: 768px) {
          .view-tabs {
            width: 100%;
          }
          .view-tab {
            flex: 1;
            justify-content: center;
          }
          .pos-layout {
            grid-template-columns: 1fr;
          }
          .sale-items-table, .sale-items-table tbody, .sale-items-table tr, .sale-items-table td {
            display: block;
            width: 100%;
          }
          .sale-items-table thead {
            display: none;
          }
          .sale-items-table tr {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 12px;
            position: relative;
          }
          .sale-items-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px dashed var(--border);
            text-align: right;
          }
          .sale-items-table td:last-child {
            position: absolute;
            top: 8px;
            right: 12px;
            border: none !important;
            padding: 0 !important;
            width: auto !important;
            z-index: 10;
          }
          .sale-items-table td:last-child::before {
            display: none !important;
          }
          .remove-btn {
            opacity: 0.8;
            background: var(--danger-light);
            padding: 6px;
            border-radius: 6px;
          }
          .sale-items-table td::before {
            content: attr(data-label);
            font-weight: 700;
            color: var(--text-muted);
            font-size: 0.75rem;
            text-transform: uppercase;
            text-align: left;
          }
          .price-cell {
            width: 100% !important;
            max-width: 140px;
          }
        }
        .summary-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .summary-card h4 { font-size: 1rem; font-weight: 700; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
        .summary-rows { display: flex; flex-direction: column; gap: 10px; }
        .summary-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.875rem; }
        .summary-row span { color: var(--text-muted); }
        .inline-input { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .inline-input span { padding: 4px 8px; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-active); border-right: 1px solid var(--border); }
        .inline-input input { border: none; background: transparent; padding: 4px 8px; width: 80px; outline: none; font-size: 0.875rem; text-align: right; }
        .total-row { border-top: 1px solid var(--border); padding-top: 10px; margin-top: 4px; }
        .total-amount { font-size: 1.2rem; font-weight: 800; }
        .profit-row { background: var(--success-light); padding: 8px 10px; border-radius: 8px; }
        .profit-row span { color: var(--success); font-weight: 600; }
        .profit-amount { color: var(--success); font-weight: 700; }
        [data-theme="dark"] .profit-row { background: rgba(52, 211, 153, 0.1); }
        .payment-section { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--border); padding-top: 16px; }
        .payment-input-wrapper { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .payment-input-wrapper span { padding: 10px 14px; font-weight: 700; background: var(--bg-active); border-right: 1px solid var(--border); color: var(--text-muted); }
        .payment-input-wrapper input { flex: 1; border: none; background: transparent; padding: 10px 12px; outline: none; font-size: 1.1rem; font-weight: 700; }
        .balance-display { display: flex; justify-content: space-between; font-size: 0.8125rem; padding: 8px 12px; background: var(--bg-active); border-radius: 8px; }
        .method-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .method-btn { padding: 8px; border-radius: 8px; font-size: 0.7rem; font-weight: 600; border: 1px solid var(--border); background: var(--background); transition: all 0.2s; }
        .method-btn.selected { background: var(--primary); color: white; border-color: var(--primary); }
        .method-btn:not(.selected):hover { background: var(--bg-active); }
        .payment-section textarea { padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--background); font-size: 0.875rem; outline: none; resize: none; }
        .submit-invoice-btn { padding: 14px; font-size: 0.9rem; border-radius: 12px; }
        .submit-invoice-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .invoice-history-card { padding: 20px; }
        .invoice-history-card h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
        .spinner-center { display: flex; justify-content: center; padding: 40px; }
        .spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
          .card-section {
            padding: 12px 14px !important;
          }
          .credit-status {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 4px !important;
          }
          .shopkeeper-select {
            font-size: 0.8125rem !important;
          }
          .method-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
