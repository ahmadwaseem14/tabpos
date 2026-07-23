'use client';

import React, { useEffect, useState } from 'react';
import { Truck, Plus, Search, Notebook, DollarSign, PlusCircle, AlertCircle, Trash2, FileText, ChevronRight, ArrowLeft, Settings } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ToastContainer, ToastMessage } from '@/components/Toast';

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  notes: string | null;
  balance: number;
  _count?: {
    purchaseInvoices: number;
    quotations: number;
  };
}

interface Quotation {
  id: string;
  title: string;
  date: string;
  details: string; // JSON string
  notes: string | null;
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

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ledger' | 'quotations' | 'pay' | 'edit'>('ledger');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form states
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newBalance, setNewBalance] = useState('0');

  // Edit states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editBalance, setEditBalance] = useState('0');

  // Payment states
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK' | 'EASYPAISA' | 'JAZZCASH' | 'CHEQUE'>('CASH');
  const [payNotes, setPayNotes] = useState('');

  // Quotation states
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteItems, setQuoteItems] = useState<{ brand: string; model: string; price: string }[]>([
    { brand: '', model: '', price: '' }
  ]);

  const addToast = (text: string, type: 'success' | 'warning' | 'error') => {
    const newToast: ToastMessage = { id: Math.random().toString(), text, type };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load suppliers
  const loadSuppliers = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      }
    } catch {
      addToast('Failed to fetch suppliers.', 'error');
    } finally {
      setLoadingList(false);
    }
  };

  // Load selected supplier details
  const loadSupplierDetails = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSupplier(data.supplier);
        setQuotations(data.quotations || []);
        setLedger(data.ledger || []);

        // Prep edit states
        setEditName(data.supplier.name);
        setEditPhone(data.supplier.phone);
        setEditAddress(data.supplier.address || '');
        setEditNotes(data.supplier.notes || '');
        setEditBalance(data.supplier.balance.toString());
      }
    } catch {
      addToast('Failed to load supplier profile details.', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      loadSupplierDetails(selectedSupplierId);
      setActiveTab('ledger');
    } else {
      setSelectedSupplier(null);
      setLedger([]);
      setQuotations([]);
    }
  }, [selectedSupplierId]);

  // Handle create supplier
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      addToast('Name and phone are required.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          address: newAddress,
          notes: newNotes,
          balance: parseFloat(newBalance) || 0
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Supplier created successfully.', 'success');
        setShowAddModal(false);
        setNewName('');
        setNewPhone('');
        setNewAddress('');
        setNewNotes('');
        setNewBalance('0');
        loadSuppliers();
      } else {
        addToast(data.error || 'Failed to create supplier.', 'error');
      }
    } catch {
      addToast('Network error creating supplier.', 'error');
    }
  };

  // Handle edit supplier details
  const handleEditSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;

    try {
      const res = await fetch(`/api/suppliers/${selectedSupplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          address: editAddress,
          notes: editNotes,
          balance: parseFloat(editBalance) || 0
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Supplier details updated.', 'success');
        loadSuppliers();
        loadSupplierDetails(selectedSupplierId);
        setActiveTab('ledger');
      } else {
        addToast(data.error || 'Failed to update supplier.', 'error');
      }
    } catch {
      addToast('Network error updating supplier.', 'error');
    }
  };

  // Handle record payment to supplier
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !payAmount) return;

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
          type: 'TO_SUPPLIER',
          supplierId: selectedSupplierId,
          amount: amt,
          method: payMethod,
          notes: payNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Payment recorded successfully.', 'success');
        setPayAmount('');
        setPayNotes('');
        loadSuppliers();
        loadSupplierDetails(selectedSupplierId);
        setActiveTab('ledger');
      } else {
        addToast(data.error || 'Failed to record payment.', 'error');
      }
    } catch {
      addToast('Network error recording payment.', 'error');
    }
  };

  // Add quotation items list
  const addQuoteItem = () => {
    setQuoteItems([...quoteItems, { brand: '', model: '', price: '' }]);
  };

  const updateQuoteItem = (idx: number, field: 'brand' | 'model' | 'price', value: string) => {
    const updated = [...quoteItems];
    updated[idx][field] = value;
    setQuoteItems(updated);
  };

  const removeQuoteItem = (idx: number) => {
    if (quoteItems.length === 1) return;
    setQuoteItems(quoteItems.filter((_, i) => i !== idx));
  };

  // Handle save quotation
  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !quoteTitle) return;

    const cleanItems = quoteItems.filter(item => item.brand.trim() && item.model.trim() && parseFloat(item.price) > 0);
    if (!cleanItems.length) {
      addToast('Please enter at least one valid tablet model and price.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/suppliers/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          title: quoteTitle,
          details: cleanItems,
          notes: quoteNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Supplier quotation saved.', 'success');
        setQuoteTitle('');
        setQuoteNotes('');
        setQuoteItems([{ brand: '', model: '', price: '' }]);
        loadSupplierDetails(selectedSupplierId);
      } else {
        addToast(data.error || 'Failed to save quotation.', 'error');
      }
    } catch {
      addToast('Network error saving quotation.', 'error');
    }
  };

  // Handle delete supplier
  const handleDeleteSupplier = async () => {
    if (!selectedSupplierId) return;
    if (!confirm('Are you sure you want to delete this supplier? This action is permanent.')) return;

    try {
      const res = await fetch(`/api/suppliers/${selectedSupplierId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Supplier deleted successfully.', 'success');
        setSelectedSupplierId(null);
        loadSuppliers();
      } else {
        addToast(data.error || 'Failed to delete supplier.', 'error');
      }
    } catch {
      addToast('Network error deleting supplier.', 'error');
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery)
  );

  return (
    <div className="suppliers-page">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="page-layout">
        {/* Left Column - List Panel */}
        <div className={`list-panel ${selectedSupplierId ? 'mobile-hidden' : ''}`}>
          <div className="panel-header">
            <div className="search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn-primary add-btn" onClick={() => setShowAddModal(true)}>
              <Plus size={18} />
              <span>Add</span>
            </button>
          </div>

          <div className="suppliers-list">
            {loadingList ? (
              <div className="spinner-center">
                <div className="spinner"></div>
              </div>
            ) : filteredSuppliers.length ? (
              filteredSuppliers.map(sup => (
                <div
                  key={sup.id}
                  className={`supplier-row-card ${selectedSupplierId === sup.id ? 'active' : ''}`}
                  onClick={() => setSelectedSupplierId(sup.id)}
                >
                  <div className="row-info">
                    <strong>{sup.name}</strong>
                    <span>{sup.phone}</span>
                  </div>
                  <div className="row-balance">
                    <span>Payable:</span>
                    <strong className={sup.balance > 0 ? 'text-danger' : ''}>
                      {formatCurrency(sup.balance)}
                    </strong>
                  </div>
                  <ChevronRight size={16} className="arrow-icon" />
                </div>
              ))
            ) : (
              <div className="list-empty">
                <span>No suppliers found</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Details Panel */}
        <div className={`details-panel ${!selectedSupplierId ? 'mobile-hidden' : ''}`}>
          {selectedSupplierId && selectedSupplier ? (
            <div className="supplier-details">

              {/* Mobile Dedicated Top Back Navigation Bar */}
              <div className="mobile-detail-topbar">
                <button className="back-list-btn" onClick={() => setSelectedSupplierId(null)}>
                  <ArrowLeft size={18} />
                  <span>Back to Suppliers</span>
                </button>
              </div>

              <div className="supplier-profile-header">
                <div className="header-info">
                  <div className="icon-wrapper">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3>{selectedSupplier.name}</h3>
                    <span>Supplier Account • {selectedSupplier.phone}</span>
                  </div>
                </div>
                <div className="header-balance">
                  <span>Current Payable</span>
                  <h2>{formatCurrency(selectedSupplier.balance)}</h2>
                </div>
              </div>

              {/* Mobile Touch-Friendly Navigation Tabs */}
              <div className="tabs-nav">
                <button className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
                  <FileText size={14} />
                  <span>Ledger</span>
                </button>
                <button className={`tab-btn ${activeTab === 'quotations' ? 'active' : ''}`} onClick={() => setActiveTab('quotations')}>
                  <Notebook size={14} />
                  <span>Quotations ({quotations.length})</span>
                </button>
                <button className={`tab-btn ${activeTab === 'pay' ? 'active' : ''}`} onClick={() => setActiveTab('pay')}>
                  <DollarSign size={14} />
                  <span>Pay Cash</span>
                </button>
                <button className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>
                  <Settings size={14} />
                  <span>Edit Details</span>
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
                          <h4>Account Ledger</h4>
                          <span className="text-muted">Chronological purchase and payment flow</span>
                        </div>
                        <div className="table-responsive pos-table-container responsive-table-cards">
                          <table className="pos-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Overhead/Cost</th>
                                <th>Payable Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ledger.length ? (
                                ledger.map((item, idx) => (
                                  <tr key={idx}>
                                    <td data-label="Date">{formatDate(item.date)}</td>
                                    <td data-label="Type">
                                      <span className={`badge ${item.type === 'PURCHASE' ? 'badge-danger' : 'badge-success'}`}>
                                        {item.type}
                                      </span>
                                    </td>
                                    <td data-label="Description">{item.description}</td>
                                    <td data-label="Amount" className={item.effect === 'INCREASE' ? 'text-danger font-semibold' : 'text-success font-semibold'}>
                                      {item.effect === 'INCREASE' ? '+' : '-'}{formatCurrency(item.amount)}
                                    </td>
                                    <td data-label="Balance"><strong>{formatCurrency(item.runningBalance)}</strong></td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="text-center text-muted">No transactions recorded yet</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* QUOTATIONS TAB */}
                    {activeTab === 'quotations' && (
                      <div className="quotations-tab">
                        <div className="quotation-columns">
                          {/* Saved Quotations List */}
                          <div className="quotations-list-side">
                            <h4>Saved Quotations</h4>
                            <div className="quote-cards-stack">
                              {quotations.length ? (
                                quotations.map(q => {
                                  let items: any[] = [];
                                  try { items = JSON.parse(q.details) || []; } catch { items = []; }

                                  return (
                                    <div key={q.id} className="card quote-item-card">
                                      <div className="quote-card-header">
                                        <strong>{q.title}</strong>
                                        <span>{formatDate(q.date)}</span>
                                      </div>
                                      <table className="quote-mini-table">
                                        <thead>
                                          <tr>
                                            <th>Model</th>
                                            <th>Price</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {items.map((it, i) => (
                                            <tr key={i}>
                                              <td>{it.brand} {it.model}</td>
                                              <td><strong>{formatCurrency(it.price)}</strong></td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                      {q.notes && <p className="quote-note">Note: {q.notes}</p>}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-muted italic">No quotations saved.</p>
                              )}
                            </div>
                          </div>

                          {/* Record New Quotation */}
                          <form className="card quote-form-side" onSubmit={handleSaveQuotation}>
                            <h4>Add Supplier Quotation</h4>

                            <div className="input-group">
                              <label>Quotation Title / Batch</label>
                              <input
                                type="text"
                                placeholder="e.g. Samsung A9 Batch Quotation"
                                value={quoteTitle}
                                onChange={e => setQuoteTitle(e.target.value)}
                                required
                              />
                            </div>

                            <div className="items-builder">
                              <label>Tablet Pricing Models</label>
                              {quoteItems.map((item, idx) => (
                                <div key={idx} className="builder-row">
                                  <input
                                    type="text"
                                    placeholder="Brand"
                                    value={item.brand}
                                    onChange={e => updateQuoteItem(idx, 'brand', e.target.value)}
                                  />
                                  <input
                                    type="text"
                                    placeholder="Model"
                                    value={item.model}
                                    onChange={e => updateQuoteItem(idx, 'model', e.target.value)}
                                  />
                                  <input
                                    type="number"
                                    placeholder="Price"
                                    value={item.price}
                                    onChange={e => updateQuoteItem(idx, 'price', e.target.value)}
                                  />
                                  <button type="button" className="remove-row-btn" onClick={() => removeQuoteItem(idx)}>
                                    &times;
                                  </button>
                                </div>
                              ))}
                              <button type="button" className="btn-secondary add-row-btn" onClick={addQuoteItem}>
                                <PlusCircle size={14} />
                                <span>Add Model Line</span>
                              </button>
                            </div>

                            <div className="input-group">
                              <label>Notes (Optional)</label>
                              <textarea
                                rows={2}
                                placeholder="Notes about payment terms or delivery speed"
                                value={quoteNotes}
                                onChange={e => setQuoteNotes(e.target.value)}
                              />
                            </div>

                            <button type="submit" className="btn-primary submit-full-btn">
                              Save Quotation
                            </button>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* PAY CASH TAB */}
                    {activeTab === 'pay' && (
                      <div className="pay-tab">
                        <form className="card payment-form" onSubmit={handleRecordPayment}>
                          <h4>Record Payment to Supplier</h4>
                          <p className="text-muted">Enter payments you made to settle outstanding supplier invoices.</p>

                          <div className="input-group">
                            <label>Payment Amount (PKR)</label>
                            <div className="price-input-wrapper big-mobile-input">
                              <span className="currency-symbol">Rs.</span>
                              <input
                                type="number"
                                placeholder="e.g. 50,000"
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
                            <label>Description / Receipt Notes</label>
                            <textarea
                              rows={3}
                              placeholder="Transaction number, cheque number, or notes..."
                              value={payNotes}
                              onChange={e => setPayNotes(e.target.value)}
                            />
                          </div>

                          <button type="submit" className="btn-primary submit-full-btn">
                            Submit Payment Record
                          </button>
                        </form>
                      </div>
                    )}

                    {/* EDIT TAB */}
                    {activeTab === 'edit' && (
                      <div className="edit-tab">
                        <div className="card edit-form-card">
                          <form onSubmit={handleEditSupplier} className="edit-form">
                            <h4>Edit Supplier Details</h4>
                            <div className="input-grid">
                              <div className="input-group">
                                <label>Supplier Name</label>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
                              </div>
                              <div className="input-group">
                                <label>Phone Number</label>
                                <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} required />
                              </div>
                            </div>
                            <div className="input-group">
                              <label>Address</label>
                              <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
                            </div>
                            <div className="input-group">
                              <label>Payable Balance Override (Rs.)</label>
                              <input type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)} />
                              <span className="warning-text">
                                <AlertCircle size={12} />
                                Overriding balance directly disrupts transaction ledger consistency. Use payments or purchases instead.
                              </span>
                            </div>
                            <div className="input-group">
                              <label>Notes</label>
                              <textarea rows={3} value={editNotes} onChange={e => setEditNotes(e.target.value)} />
                            </div>

                            <div className="edit-actions">
                              <button type="submit" className="btn-primary">Save Changes</button>
                              <button
                                type="button"
                                className="btn-secondary delete-btn"
                                onClick={handleDeleteSupplier}
                              >
                                <Trash2 size={16} />
                                <span>Delete Supplier Account</span>
                              </button>
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
              <Truck size={48} className="text-muted animate-pulse" />
              <h3>Select a Supplier</h3>
              <p>Click a supplier on the left panel to manage accounts, view ledger histories, or check price quotes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Supplier Profile</h3>
              <button className="close-modal-btn" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSupplier}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Supplier Name / Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Samsung Official distributor"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 0300-1234567"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Physical Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Hall Road, Lahore"
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Opening Outstanding Payable Balance (Rs.)</label>
                  <input
                    type="number"
                    value={newBalance}
                    onChange={e => setNewBalance(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Notes regarding delivery speed, return policies..."
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .suppliers-page {
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

        .suppliers-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .supplier-row-card {
          display: flex;
          align-items: center;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all 0.2s;
          background: var(--background);
        }

        .supplier-row-card:hover {
          border-color: var(--primary);
          background: var(--bg-active);
        }

        .supplier-row-card.active {
          border-color: var(--primary);
          background: var(--primary-light);
          color: var(--primary);
        }

        [data-theme="dark"] .supplier-row-card.active {
          background: rgba(129, 140, 248, 0.1);
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

        .supplier-row-card.active .row-info strong,
        .supplier-row-card.active .row-balance strong {
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

        .supplier-details {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .mobile-detail-topbar {
          display: none;
        }

        .supplier-profile-header {
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
          background: var(--primary-light);
          color: var(--primary);
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
        .text-danger { color: var(--danger); }
        .text-success { color: var(--success); }

        /* Quotations tab styles */
        .quotation-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .quote-cards-stack { display: flex; flex-direction: column; gap: 16px; max-height: 480px; overflow-y: auto; }
        .quote-item-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .quote-card-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
        .quote-card-header strong { font-weight: 700; }
        .quote-card-header span { font-size: 0.75rem; color: var(--text-muted); }
        .quote-mini-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        .quote-mini-table th { text-align: left; color: var(--text-muted); padding-bottom: 6px; border-bottom: 1px solid var(--border); }
        .quote-mini-table td { padding: 6px 0; border-bottom: 1px dashed var(--border); }
        .quote-mini-table tr:last-child td { border-bottom: none; }
        .quote-note { font-size: 0.75rem; color: var(--text-muted); background: var(--background); padding: 6px 10px; border-radius: 6px; }
        .quote-form-side { padding: 20px; display: flex; flex-direction: column; gap: 16px; height: fit-content; }
        .items-builder { display: flex; flex-direction: column; gap: 10px; }
        .items-builder label { font-size: 0.8125rem; font-weight: 600; }
        .builder-row { display: flex; gap: 8px; align-items: center; }
        .builder-row input { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.8125rem; background: var(--background); outline: none; }
        .builder-row input:focus { border-color: var(--primary); }
        .builder-row input[type="number"] { flex: 0 0 100px; }
        .remove-row-btn { font-size: 1.5rem; color: var(--text-muted); padding: 0 4px; }
        .remove-row-btn:hover { color: var(--danger); }
        .add-row-btn { padding: 8px; font-size: 0.75rem; border-radius: 8px; }

        /* General Forms & inputs */
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

        /* Responsive Mobile layout rules */
        @media (max-width: 768px) {
          .suppliers-page {
            height: auto;
            min-height: calc(100vh - var(--navbar-height) - var(--bottom-nav-height, 60px) - 20px);
            padding-bottom: 20px;
          }
          .page-layout {
            height: auto;
            border-radius: 12px;
            flex-direction: column;
          }
          .list-panel { width: 100%; border-right: none; }
          .details-panel { width: 100%; overflow: visible; }
          .mobile-hidden { display: none !important; }

          .mobile-detail-topbar {
            display: flex;
            align-items: center;
            padding: 10px 14px;
            background: var(--bg-active);
            border-bottom: 1px solid var(--border);
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

          .supplier-profile-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
          }
          .header-balance {
            text-align: left;
            width: 100%;
            background: var(--background);
            padding: 12px 14px;
            border-radius: 12px;
            border: 1px solid var(--border);
          }
          .header-balance h2 { font-size: 1.35rem; }

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

          .tab-content { padding: 14px; overflow: visible; }
          .quotation-columns { grid-template-columns: 1fr; }
          .builder-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            background: var(--bg-active);
            padding: 12px;
            border-radius: 10px;
            position: relative;
            padding-right: 32px;
          }
          .builder-row input { width: 100% !important; }
          .builder-row input[type="number"] { grid-column: span 2; flex: none !important; }
          .builder-row .remove-row-btn { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); margin: 0; padding: 4px 8px; }
          .input-grid { grid-template-columns: 1fr; }
          .edit-actions { flex-direction: column; gap: 12px; }
          .edit-actions button { width: 100%; justify-content: center; }
        }

        @media (max-width: 600px) {
          .supplier-profile-header {
            padding: 14px;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .header-info {
            gap: 10px;
            min-width: 0;
          }
          .icon-wrapper {
            width: 42px;
            height: 42px;
            flex-shrink: 0;
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
            width: 100%;
            text-align: left;
            background: var(--background);
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid var(--border);
          }
          .header-balance h2 {
            font-size: 1.25rem;
          }
          .supplier-row-card {
            padding: 12px;
            gap: 8px;
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

          /* Detail Tab Cards Responsiveness (< 600px) */
          .tab-content {
            padding: 10px;
            overflow-x: hidden;
          }
          .card, .quote-form-side, .quote-item-card, .payment-form, .edit-form-card {
            padding: 14px !important;
            border-radius: 14px !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .builder-row {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
            padding-right: 36px !important;
          }
          .builder-row input[type="number"] {
            grid-column: span 1 !important;
          }
          .quote-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
          .quote-mini-table {
            word-break: break-word;
          }
          .method-pill-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
          }
          .method-pill {
            padding: 8px 10px !important;
            font-size: 0.75rem !important;
            text-align: center !important;
            width: 100% !important;
          }
          .input-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .big-mobile-input input {
            font-size: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
