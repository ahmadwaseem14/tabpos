'use client';

import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, DollarSign, AlertCircle, Trash2, FileText, ChevronRight, Tablet, Undo2, ArrowLeft, Settings } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ToastContainer, ToastMessage } from '@/components/Toast';

interface Shopkeeper {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  shopName: string;
  creditLimit: number;
  balance: number;
  isOwnShop: boolean;
  notes: string | null;
  _count?: {
    saleInvoices: number;
    payments: number;
  };
}

interface InventoryItem {
  imei: string;
  serialNumber: string | null;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  color: string;
  purchasePrice: number;
  qcStatus: string;
  dateSupplied: string;
}

interface LedgerItem {
  id: string;
  date: string;
  type: string;
  reference: string;
  description: string;
  amount: number;
  effect: 'INCREASE' | 'DECREASE';
  runningBalance: number;
}

export default function ShopkeepersPage() {
  const [shopkeepers, setShopkeepers] = useState<Shopkeeper[]>([]);
  const [selectedShopkeeperId, setSelectedShopkeeperId] = useState<string | null>(null);
  const [selectedShopkeeper, setSelectedShopkeeper] = useState<Shopkeeper | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ledger' | 'inventory' | 'pay' | 'edit'>('ledger');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form states
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('50000');
  const [newBalance, setNewBalance] = useState('0');
  const [newNotes, setNewNotes] = useState('');

  // Edit states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editShopName, setEditShopName] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState('0');
  const [editBalance, setEditBalance] = useState('0');
  const [editNotes, setEditNotes] = useState('');

  // Payment states
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK' | 'EASYPAISA' | 'JAZZCASH' | 'CHEQUE'>('CASH');
  const [payNotes, setPayNotes] = useState('');

  // Return tablet modal states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnImei, setReturnImei] = useState('');
  const [returnModelName, setReturnModelName] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [returnAction, setReturnAction] = useState<'WAREHOUSE' | 'DAMAGED'>('WAREHOUSE');
  const [returnNotes, setReturnNotes] = useState('');

  const addToast = (text: string, type: 'success' | 'warning' | 'error') => {
    const newToast: ToastMessage = { id: Math.random().toString(), text, type };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load shopkeepers
  const loadShopkeepers = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/shopkeepers');
      if (res.ok) {
        const data = await res.json();
        setShopkeepers(data.shopkeepers || []);
      }
    } catch {
      addToast('Failed to fetch shopkeepers list.', 'error');
    } finally {
      setLoadingList(false);
    }
  };

  // Load selected shopkeeper profile details
  const loadShopkeeperDetails = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/shopkeepers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedShopkeeper(data.shopkeeper);
        setInventory(data.inventory || []);
        setLedger(data.ledger || []);

        // Prep edit states
        setEditName(data.shopkeeper.name);
        setEditPhone(data.shopkeeper.phone);
        setEditAddress(data.shopkeeper.address || '');
        setEditShopName(data.shopkeeper.shopName);
        setEditCreditLimit(data.shopkeeper.creditLimit.toString());
        setEditBalance(data.shopkeeper.balance.toString());
        setEditNotes(data.shopkeeper.notes || '');
      }
    } catch {
      addToast('Failed to load shopkeeper profile.', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadShopkeepers();
  }, []);

  useEffect(() => {
    if (selectedShopkeeperId) {
      loadShopkeeperDetails(selectedShopkeeperId);
      setActiveTab('ledger');
    } else {
      setSelectedShopkeeper(null);
      setInventory([]);
      setLedger([]);
    }
  }, [selectedShopkeeperId]);

  // Handle add shopkeeper
  const handleAddShopkeeper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || !newShopName.trim()) {
      addToast('Name, phone, and shop name are required.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/shopkeepers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          address: newAddress,
          shopName: newShopName,
          creditLimit: parseFloat(newCreditLimit) || 0,
          balance: parseFloat(newBalance) || 0,
          notes: newNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Shopkeeper profile created successfully.', 'success');
        setShowAddModal(false);
        setNewName('');
        setNewPhone('');
        setNewAddress('');
        setNewShopName('');
        setNewCreditLimit('50000');
        setNewBalance('0');
        setNewNotes('');
        loadShopkeepers();
      } else {
        addToast(data.error || 'Failed to create shopkeeper.', 'error');
      }
    } catch {
      addToast('Network error creating shopkeeper.', 'error');
    }
  };

  // Handle edit shopkeeper
  const handleEditShopkeeper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopkeeperId) return;

    try {
      const res = await fetch(`/api/shopkeepers/${selectedShopkeeperId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          address: editAddress,
          shopName: editShopName,
          creditLimit: parseFloat(editCreditLimit) || 0,
          balance: parseFloat(editBalance) || 0,
          notes: editNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Shopkeeper details updated.', 'success');
        loadShopkeepers();
        loadShopkeeperDetails(selectedShopkeeperId);
        setActiveTab('ledger');
      } else {
        addToast(data.error || 'Failed to update shopkeeper.', 'error');
      }
    } catch {
      addToast('Network error updating shopkeeper.', 'error');
    }
  };

  // Handle receive payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopkeeperId || !payAmount) return;

    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) {
      addToast('Payment amount must be greater than zero.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FROM_SHOPKEEPER',
          shopkeeperId: selectedShopkeeperId,
          amount: amt,
          method: payMethod,
          notes: payNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Payment record saved.', 'success');
        setPayAmount('');
        setPayNotes('');
        loadShopkeepers();
        loadShopkeeperDetails(selectedShopkeeperId);
        setActiveTab('ledger');
      } else {
        addToast(data.error || 'Failed to record payment.', 'error');
      }
    } catch {
      addToast('Network error saving payment receipt.', 'error');
    }
  };

  // Open return modal
  const openReturnModal = (item: InventoryItem) => {
    setReturnImei(item.imei);
    setReturnModelName(`${item.brand} ${item.model}`);
    setRefundAmount('0');
    setReturnNotes('');
    setReturnAction('WAREHOUSE');
    setShowReturnModal(true);
  };

  // Handle execute tablet return
  const handleReturnTablet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopkeeperId || !returnImei) return;

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FROM_SHOPKEEPER',
          imei: returnImei,
          refundAmount: parseFloat(refundAmount) || 0,
          notes: returnNotes,
          action: returnAction
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Tablet returned to Warehouse successfully.', 'success');
        setShowReturnModal(false);
        loadShopkeepers();
        loadShopkeeperDetails(selectedShopkeeperId);
        setActiveTab('inventory');
      } else {
        addToast(data.error || 'Failed to return tablet.', 'error');
      }
    } catch {
      addToast('Network error processing return.', 'error');
    }
  };

  // Handle delete shopkeeper
  const handleDeleteShopkeeper = async () => {
    if (!selectedShopkeeperId) return;
    if (!confirm('Are you sure you want to delete this shopkeeper? This is permanent.')) return;

    try {
      const res = await fetch(`/api/shopkeepers/${selectedShopkeeperId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Shopkeeper profile deleted.', 'success');
        setSelectedShopkeeperId(null);
        loadShopkeepers();
      } else {
        addToast(data.error || 'Failed to delete shopkeeper.', 'error');
      }
    } catch {
      addToast('Network error deleting shopkeeper.', 'error');
    }
  };

  const filteredShopkeepers = shopkeepers.filter(sk =>
    sk.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sk.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sk.phone.includes(searchQuery)
  );

  return (
    <div className="shopkeepers-page">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="page-layout">
        {/* Left Column - List Panel */}
        <div className={`list-panel ${selectedShopkeeperId ? 'mobile-hidden' : ''}`}>
          <div className="panel-header">
            <div className="search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search shopkeepers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn-primary add-btn" onClick={() => setShowAddModal(true)}>
              <Plus size={18} />
              <span>Add</span>
            </button>
          </div>

          <div className="shopkeepers-list">
            {loadingList ? (
              <div className="spinner-center">
                <div className="spinner"></div>
              </div>
            ) : filteredShopkeepers.length ? (
              filteredShopkeepers.map(sk => (
                <div
                  key={sk.id}
                  className={`shopkeeper-row-card ${selectedShopkeeperId === sk.id ? 'active' : ''} ${sk.isOwnShop ? 'own-shop' : ''}`}
                  onClick={() => setSelectedShopkeeperId(sk.id)}
                >
                  <div className="row-info">
                    <div className="title-row">
                      <strong>{sk.shopName}</strong>
                      {sk.isOwnShop && <span className="badge badge-primary own-badge">Own Shop</span>}
                    </div>
                    <span>{sk.name} • {sk.phone}</span>
                  </div>
                  {!sk.isOwnShop && (
                    <div className="row-balance">
                      <span>Owes Us:</span>
                      <strong className={sk.balance > 0 ? 'text-warning' : ''}>
                        {formatCurrency(sk.balance)}
                      </strong>
                    </div>
                  )}
                  <ChevronRight size={16} className="arrow-icon" />
                </div>
              ))
            ) : (
              <div className="list-empty">
                <span>No shopkeepers registered</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Details Panel */}
        <div className={`details-panel ${!selectedShopkeeperId ? 'mobile-hidden' : ''}`}>
          {selectedShopkeeperId && selectedShopkeeper ? (
            <div className="shopkeeper-details">

              {/* Mobile Dedicated Top Back Navigation Bar */}
              <div className="mobile-detail-topbar">
                <button className="back-list-btn" onClick={() => setSelectedShopkeeperId(null)}>
                  <ArrowLeft size={18} />
                  <span>Back to Shopkeepers</span>
                </button>
              </div>

              <div className="shopkeeper-profile-header">
                <div className="header-info">
                  <div className="icon-wrapper">
                    <Users size={24} />
                  </div>
                  <div>
                    <div className="title-row">
                      <h3>{selectedShopkeeper.shopName}</h3>
                      {selectedShopkeeper.isOwnShop && <span className="badge badge-primary">Retail Outlet</span>}
                    </div>
                    <span>Contact: {selectedShopkeeper.name} • {selectedShopkeeper.phone}</span>
                  </div>
                </div>
                {!selectedShopkeeper.isOwnShop && (
                  <div className="header-balance">
                    <span>Outstanding Balance</span>
                    <h2 className={selectedShopkeeper.balance > 0 ? 'text-warning' : ''}>
                      {formatCurrency(selectedShopkeeper.balance)}
                    </h2>
                    <span className="limit-label">Limit: {formatCurrency(selectedShopkeeper.creditLimit)}</span>
                  </div>
                )}
              </div>

              {/* Mobile Touch-Friendly Navigation Tabs */}
              <div className="tabs-nav">
                <button className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
                  <FileText size={14} />
                  <span>Ledger</span>
                </button>
                <button className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
                  <Tablet size={14} />
                  <span>Stock Inventory ({inventory.length})</span>
                </button>
                {!selectedShopkeeper.isOwnShop && (
                  <button className={`tab-btn ${activeTab === 'pay' ? 'active' : ''}`} onClick={() => setActiveTab('pay')}>
                    <DollarSign size={14} />
                    <span>Receive Payment</span>
                  </button>
                )}
                <button className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>
                  <Settings size={14} />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* Tab Content panels */}
              <div className="tab-content">
                {loadingDetail ? (
                  <div className="spinner-center" style={{ height: '200px' }}>
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <>
                    {/* LEDGER TAB */}
                    {activeTab === 'ledger' && (
                      <div className="ledger-tab">
                        <div className="card-list-header">
                          <h4>Financial Ledger</h4>
                          <span className="text-muted">History of POS invoices and payments</span>
                        </div>
                        <div className="table-responsive pos-table-container responsive-table-cards">
                          <table className="pos-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Amount Impact</th>
                                <th>Outstanding Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ledger.length ? (
                                ledger.map((item, idx) => (
                                  <tr key={idx}>
                                    <td data-label="Date">{formatDate(item.date)}</td>
                                    <td data-label="Type">
                                      <span className={`badge ${item.type === 'SALE' ? 'badge-primary' : 'badge-success'}`}>
                                        {item.type}
                                      </span>
                                    </td>
                                    <td data-label="Description">{item.description}</td>
                                    <td data-label="Impact" className={item.effect === 'INCREASE' ? 'text-warning font-semibold' : 'text-success font-semibold'}>
                                      {item.effect === 'INCREASE' ? '+' : '-'}{formatCurrency(item.amount)}
                                    </td>
                                    <td data-label="Balance"><strong>{formatCurrency(item.runningBalance)}</strong></td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="text-center text-muted">No transaction ledgers found</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* CURRENT STOCK INVENTORY TAB */}
                    {activeTab === 'inventory' && (
                      <div className="inventory-tab">
                        <div className="card-list-header">
                          <h4>Stock at Shopkeeper</h4>
                          <span className="text-muted">List of active tablets currently checked-out / transferred to this store</span>
                        </div>
                        <div className="table-responsive pos-table-container responsive-table-cards">
                          <table className="pos-table">
                            <thead>
                              <tr>
                                <th>Brand / Model</th>
                                <th>IMEI</th>
                                <th>QC Status</th>
                                <th>Date Transferred</th>
                                <th>Return Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inventory.length ? (
                                inventory.map((item) => (
                                  <tr key={item.imei}>
                                    <td data-label="Model">
                                      <strong>{item.brand} {item.model}</strong>
                                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {item.ram} RAM / {item.storage} Storage
                                      </span>
                                    </td>
                                    <td data-label="IMEI">
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <strong>{item.imei}</strong>
                                        {item.serialNumber && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>S/N: {item.serialNumber}</span>}
                                      </div>
                                    </td>
                                    <td data-label="QC Status">
                                      <span className={`badge ${item.qcStatus === 'CHECKED_OK' ? 'badge-success' : 'badge-warning'}`}>
                                        {item.qcStatus}
                                      </span>
                                    </td>
                                    <td data-label="Date">{formatDate(item.dateSupplied)}</td>
                                    <td data-label="Action">
                                      <button
                                        type="button"
                                        className="btn-secondary return-stock-btn"
                                        onClick={() => openReturnModal(item)}
                                      >
                                        <Undo2 size={12} />
                                        <span>Return to Warehouse</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="text-center text-muted">No active stock at this location</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* RECORD PAYMENT RECEIPT TAB */}
                    {activeTab === 'pay' && (
                      <div className="pay-tab">
                        <form className="card payment-form" onSubmit={handleRecordPayment}>
                          <h4>Record Payment Received</h4>
                          <p className="text-muted">Log cash payments received from shopkeeper to clear receivables.</p>

                          <div className="input-group">
                            <label>Payment Amount Received (PKR)</label>
                            <div className="price-input-wrapper big-mobile-input">
                              <span className="currency-symbol">Rs.</span>
                              <input
                                type="number"
                                placeholder="e.g. 35,000"
                                value={payAmount}
                                onChange={e => setPayAmount(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="input-group">
                            <label>Payment Method</label>
                            <div className="method-pill-grid">
                              {(['CASH', 'BANK', 'EASYPAISA', 'JAZZCASH', 'CHEQUE'] as const).map(m => (
                                <button
                                  key={m}
                                  type="button"
                                  className={`method-pill ${payMethod === m ? 'active' : ''}`}
                                  onClick={() => setPayMethod(m)}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="input-group">
                            <label>Reference Details / Notes</label>
                            <textarea
                              rows={3}
                              placeholder="Transaction number, cheque details, or payments notes..."
                              value={payNotes}
                              onChange={e => setPayNotes(e.target.value)}
                            />
                          </div>

                          <button type="submit" className="btn-primary submit-full-btn">
                            Save Cash Receipt
                          </button>
                        </form>
                      </div>
                    )}

                    {/* EDIT PROFILE TAB */}
                    {activeTab === 'edit' && (
                      <div className="edit-tab">
                        <div className="card edit-form-card">
                          <form onSubmit={handleEditShopkeeper} className="edit-form">
                            <h4>Edit Shopkeeper Profile</h4>

                            <div className="input-grid">
                              <div className="input-group">
                                <label>Shop Name</label>
                                <input type="text" value={editShopName} onChange={e => setEditShopName(e.target.value)} required disabled={selectedShopkeeper.isOwnShop} />
                              </div>
                              <div className="input-group">
                                <label>Owner / Contact Name</label>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
                              </div>
                            </div>

                            <div className="input-grid">
                              <div className="input-group">
                                <label>Phone Number</label>
                                <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} required />
                              </div>
                              <div className="input-group">
                                <label>Credit Limit (PKR)</label>
                                <input type="number" value={editCreditLimit} onChange={e => setEditCreditLimit(e.target.value)} required disabled={selectedShopkeeper.isOwnShop} />
                              </div>
                            </div>

                            <div className="input-group">
                              <label>Physical Address</label>
                              <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
                            </div>

                            <div className="input-group">
                              <label>Outstanding Balance Override (Rs.)</label>
                              <input type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)} disabled={selectedShopkeeper.isOwnShop} />
                              <span className="warning-text">
                                <AlertCircle size={12} />
                                Overriding balance directly bypasses ledger invoices and is not recommended.
                              </span>
                            </div>

                            <div className="input-group">
                              <label>Notes</label>
                              <textarea rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} />
                            </div>

                            <div className="edit-actions">
                              <button type="submit" className="btn-primary">Save Changes</button>
                              {!selectedShopkeeper.isOwnShop && (
                                <button
                                  type="button"
                                  className="btn-secondary delete-btn"
                                  onClick={handleDeleteShopkeeper}
                                >
                                  <Trash2 size={16} />
                                  <span>Delete Shopkeeper</span>
                                </button>
                              )}
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="details-empty">
              <Users size={48} className="text-muted animate-pulse" />
              <h3>Select a Shopkeeper</h3>
              <p>Click a shopkeeper record on the left to verify credit limits, receive cash payments, return stock, or edit profiles.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Shopkeeper Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register New Shopkeeper</h3>
              <button className="close-modal-btn" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddShopkeeper}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Shop / Outlet Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Al-Madina Mobile Zone"
                    value={newShopName}
                    onChange={e => setNewShopName(e.target.value)}
                    required
                  />
                </div>

                <div className="input-grid">
                  <div className="input-group">
                    <label>Owner / Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Muhammad Ali"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 0321-7654321"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-grid">
                  <div className="input-group">
                    <label>Credit Limit (PKR)</label>
                    <input
                      type="number"
                      value={newCreditLimit}
                      onChange={e => setNewCreditLimit(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Opening Debt Balance (Owed to Us)</label>
                    <input
                      type="number"
                      value={newBalance}
                      onChange={e => setNewBalance(e.target.value)}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Shop Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Shop #12, Mobile Market, Multan"
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Internal Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Payment preferences, credit reliability ratings..."
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Register Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Tablet Dialog Modal */}
      {showReturnModal && (
        <div className="modal-backdrop" onClick={() => setShowReturnModal(false)}>
          <div className="modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Stock Return</h3>
              <button className="close-modal-btn" onClick={() => setShowReturnModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleReturnTablet}>
              <div className="modal-body">
                <div className="highlight-banner">
                  <Tablet size={16} />
                  <span>
                    Returning <strong>{returnModelName}</strong> (IMEI: {returnImei}) to main Warehouse.
                  </span>
                </div>

                <div className="input-group">
                  <label>Credit Refund Amount (Rs.)</label>
                  <input
                    type="number"
                    placeholder="Refund credited back to shopkeeper balance"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    required
                  />
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    This amount will be deducted (credited) from the shopkeeper&apos;s outstanding balance.
                  </span>
                </div>

                <div className="input-group">
                  <label>Warehouse Storage Destination</label>
                  <select value={returnAction} onChange={e => setReturnAction(e.target.value as any)}>
                    <option value="WAREHOUSE">Warehouse (Mark as AVAILABLE for distribution)</option>
                    <option value="DAMAGED">Faulty / Damaged (Move to Faulty warehouse shelf)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Return Notes / Reason</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Customer returned due to screen issue, or wrong model shipped..."
                    value={returnNotes}
                    onChange={e => setReturnNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowReturnModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Confirm & Process Return</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .shopkeepers-page {
          height: calc(100vh - var(--navbar-height) - 48px);
        }

        .page-layout {
          display: flex;
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
          background: var(--bg-card);
          border: 1px solid var(--border);
        }

        /* Left List Panel */
        .list-panel {
          width: 320px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
        }

        .panel-header {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          gap: 10px;
        }

        .search-bar {
          flex: 1;
          display: flex;
          align-items: center;
          background: var(--background);
          border: 1px solid var(--border);
          padding: 6px 12px;
          border-radius: 10px;
          gap: 8px;
        }

        .search-bar input {
          border: none;
          background: transparent;
          width: 100%;
          outline: none;
          font-size: 0.8125rem;
        }

        .add-btn {
          padding: 8px 12px;
          border-radius: 10px;
        }

        .shopkeepers-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shopkeeper-row-card {
          display: flex;
          align-items: center;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all 0.2s;
          background: var(--background);
        }

        .shopkeeper-row-card:hover {
          border-color: var(--primary);
          background: var(--bg-active);
        }

        .shopkeeper-row-card.active {
          border-color: var(--primary);
          background: var(--primary-light);
          color: var(--primary);
        }

        [data-theme="dark"] .shopkeeper-row-card.active {
          background: rgba(129, 140, 248, 0.1);
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .own-badge {
          font-size: 0.6rem !important;
          padding: 2px 6px !important;
        }

        .row-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .row-info strong {
          font-size: 0.875rem;
          color: var(--foreground);
        }

        .row-info span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .row-balance {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          margin-right: 8px;
        }

        .row-balance span {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .row-balance strong {
          font-size: 0.8125rem;
        }

        .arrow-icon {
          color: var(--text-muted);
        }

        .shopkeeper-row-card.active .row-info strong,
        .shopkeeper-row-card.active .row-balance strong {
          color: var(--primary);
        }

        /* Right Details Panel */
        .details-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          background: var(--bg-card);
        }

        .details-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: 100%;
          gap: 12px;
          color: var(--text-muted);
          padding: 40px;
        }

        .details-empty h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--foreground);
        }

        .details-empty p {
          max-width: 320px;
          font-size: 0.875rem;
        }

        .shopkeeper-details {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .mobile-detail-topbar {
          display: none;
        }

        .shopkeeper-profile-header {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: var(--secondary-light);
          color: var(--secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-info h3 {
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .header-info span {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .header-balance {
          text-align: right;
        }

        .header-balance span {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .header-balance h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--foreground);
        }

        .limit-label {
          display: block;
          font-size: 0.75rem !important;
          color: var(--text-muted);
          margin-top: 4px;
          font-weight: 600;
        }

        .tabs-nav {
          display: flex;
          background: var(--background);
          padding: 6px 16px 0 16px;
          border-bottom: 1px solid var(--border);
          gap: 8px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-muted);
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: var(--foreground);
        }

        .tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .tab-content {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }

        /* Method Pills */
        .method-pill-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }
        .method-pill {
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--background);
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.15s;
        }
        .method-pill.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .big-mobile-input input {
          font-size: 1.1rem !important;
          font-weight: 700 !important;
        }
        .submit-full-btn {
          width: 100%;
          padding: 12px;
          justify-content: center;
          margin-top: 6px;
        }

        /* Ledger Tab styles */
        .card-list-header { margin-bottom: 16px; }
        .card-list-header h4 { font-size: 1rem; font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .text-warning { color: var(--warning); }
        .text-success { color: var(--success); }

        .return-stock-btn {
          padding: 6px 10px;
          font-size: 0.75rem;
          border-radius: 8px;
          color: var(--danger);
          border-color: rgba(239, 68, 68, 0.1);
        }
        .return-stock-btn:hover { background: var(--danger-light); }

        /* Forms & inputs */
        .input-group { display: flex; flex-direction: column; gap: 6px; width: 100%; }
        .input-group label { font-size: 0.8125rem; font-weight: 600; color: var(--foreground); }
        .input-group input, .input-group select, .input-group textarea { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--background); outline: none; font-size: 0.875rem; }
        .input-group input:focus, .input-group select:focus, .input-group textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
        .price-input-wrapper { display: flex; align-items: center; background: var(--background); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .price-input-wrapper:focus-within { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
        .currency-symbol { padding: 0 12px; font-size: 0.875rem; font-weight: 600; color: var(--text-muted); }
        .price-input-wrapper input { border: none !important; box-shadow: none !important; flex: 1; }

        .edit-form-card { padding: 24px; }
        .edit-form { display: flex; flex-direction: column; gap: 16px; }
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .warning-text { font-size: 0.75rem; color: var(--warning); display: flex; align-items: center; gap: 4px; margin-top: -2px; }
        .edit-actions { display: flex; justify-content: space-between; margin-top: 10px; }
        .delete-btn { color: var(--danger); border-color: rgba(239, 68, 68, 0.2); }
        .delete-btn:hover { background: var(--danger-light); }

        .highlight-banner { display: flex; align-items: center; gap: 8px; background: var(--primary-light); color: var(--primary); padding: 10px 14px; border-radius: 10px; font-size: 0.8125rem; line-height: 1.4; }
        [data-theme="dark"] .highlight-banner { background: rgba(129, 140, 248, 0.1); }

        .spinner-center { display: flex; align-items: center; justify-content: center; padding: 20px; flex: 1; }
        .spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Modals */
        .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-card { background: var(--bg-card); border: 1px solid var(--border); width: 100%; max-width: 480px; border-radius: 20px; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; overflow: hidden; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
        .modal-header h3 { font-size: 1rem; font-weight: 700; }
        .close-modal-btn { font-size: 1.5rem; color: var(--text-muted); }
        .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .modal-footer { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }

        /* Responsive Layout details */
        @media (max-width: 768px) {
          .shopkeepers-page {
            height: auto;
            min-height: calc(100vh - var(--navbar-height) - var(--bottom-nav-height, 60px) - 20px);
            padding-bottom: 20px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            overflow-x: hidden;
          }
          .page-layout {
            height: auto;
            border-radius: 12px;
            flex-direction: column;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            overflow-x: hidden;
          }
          .list-panel {
            width: 100%;
            max-width: 100%;
            border-right: none;
            box-sizing: border-box;
          }
          .details-panel {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
            box-sizing: border-box;
          }
          .shopkeeper-details {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            overflow-x: hidden;
          }
          .mobile-hidden { display: none !important; }

          .mobile-detail-topbar {
            display: flex;
            align-items: center;
            padding: 10px 14px;
            background: var(--bg-active);
            border-bottom: 1px solid var(--border);
            width: 100%;
            box-sizing: border-box;
          }
          .back-list-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--primary);
            background: transparent;
            border: none;
            cursor: pointer;
          }

          .shopkeeper-profile-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 14px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }
          .header-info {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            gap: 10px;
          }
          .header-info h3 {
            font-size: 1.15rem;
            word-break: break-word;
          }
          .header-info span {
            font-size: 0.75rem;
            word-break: break-word;
            white-space: normal;
          }
          .header-balance {
            text-align: left;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            background: var(--background);
            padding: 10px 12px;
            border-radius: 12px;
            border: 1px solid var(--border);
          }
          .header-balance h2 {
            font-size: 1.25rem;
            word-break: break-word;
          }

          /* Touch-friendly Pill Tab Nav on Mobile */
          .tabs-nav {
            display: flex;
            overflow-x: auto;
            white-space: nowrap;
            padding: 10px 12px;
            gap: 8px;
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }
          .tabs-nav::-webkit-scrollbar { display: none; }
          .tab-btn {
            flex-shrink: 0;
            padding: 8px 14px;
            border-radius: 999px;
            background: var(--background);
            border: 1px solid var(--border);
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-muted);
          }
          .tab-btn.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
          }

          .tab-content {
            padding: 10px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            overflow-x: hidden;
          }
          .card, .edit-form-card, .payment-form {
            padding: 14px !important;
            border-radius: 14px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .method-pill-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)) !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .method-pill {
            padding: 8px 10px !important;
            font-size: 0.75rem !important;
            text-align: center !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .input-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .edit-actions {
            flex-direction: column;
            gap: 12px;
          }
          .edit-actions button {
            width: 100%;
            justify-content: center;
          }
          .big-mobile-input input {
            font-size: 1rem !important;
            width: 100% !important;
          }
          .shopkeeper-row-card {
            padding: 12px;
            gap: 8px;
            width: 100%;
            box-sizing: border-box;
          }
          .row-info {
            min-width: 0;
            flex: 1;
          }
          .row-info strong {
            font-size: 0.875rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
          }
          .row-info span {
            font-size: 0.72rem;
          }
          .row-balance {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
