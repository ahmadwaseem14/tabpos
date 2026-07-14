'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ToastContainer, ToastMessage } from '@/components/Toast';

interface Payment {
  id: string;
  date: string;
  type: string;
  supplier: { name: string } | null;
  shopkeeper: { shopName: string } | null;
  amount: number;
  method: string;
  notes: string | null;
}

interface Supplier { id: string; name: string; }
interface Shopkeeper { id: string; shopName: string; isOwnShop: boolean; }

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shopkeepers, setShopkeepers] = useState<Shopkeeper[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [payType, setPayType] = useState<'TO_SUPPLIER' | 'FROM_SHOPKEEPER'>('FROM_SHOPKEEPER');
  const [supplierId, setSupplierId] = useState('');
  const [shopkeeperId, setShopkeeperId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addToast = (text: string, type: 'success' | 'warning' | 'error') => {
    setToasts(prev => [...prev, { id: Math.random().toString(), text, type }]);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [payRes, skRes, supRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/shopkeepers'),
        fetch('/api/suppliers')
      ]);
      if (payRes.ok) setPayments((await payRes.json()).payments || []);
      if (skRes.ok) setShopkeepers((await skRes.json()).shopkeepers || []);
      if (supRes.ok) setSuppliers((await supRes.json()).suppliers || []);
    } catch { addToast('Failed to load data.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { addToast('Amount must be greater than zero.', 'warning'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: payType, supplierId: payType === 'TO_SUPPLIER' ? supplierId : null, shopkeeperId: payType === 'FROM_SHOPKEEPER' ? shopkeeperId : null, amount: amt, method, notes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Payment recorded successfully.', 'success');
        setShowModal(false);
        setAmount(''); setNotes(''); setSupplierId(''); setShopkeeperId('');
        loadData();
      } else { addToast(data.error || 'Failed to record.', 'error'); }
    } catch { addToast('Network error.', 'error'); }
    finally { setSubmitting(false); }
  };

  const totalInflow = payments.filter(p => p.type === 'FROM_SHOPKEEPER' && p.amount > 0).reduce((s, p) => s + p.amount, 0);
  const totalOutflow = payments.filter(p => p.type === 'TO_SUPPLIER' && p.amount > 0).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="payments-page">
      <ToastContainer toasts={toasts} onClose={id => setToasts(p => p.filter(t => t.id !== id))} />

      <div className="kpi-row">
        <div className="kpi-card success">
          <TrendingUp size={22} />
          <div>
            <span>Total Inflow (From Shopkeepers)</span>
            <strong>{formatCurrency(totalInflow)}</strong>
          </div>
        </div>
        <div className="kpi-card danger">
          <TrendingDown size={22} />
          <div>
            <span>Total Outflow (To Suppliers)</span>
            <strong>{formatCurrency(totalOutflow)}</strong>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <h3>Payment Ledger</h3>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Record Payment
        </button>
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="spinner-center"><div className="spinner"></div></div>
        ) : (
          <div className="pos-table-container responsive-table-cards">
            <table className="pos-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Party</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.length ? payments.map(p => (
                  <tr key={p.id}>
                    <td data-label="Date">{formatDate(p.date)}</td>
                    <td data-label="Type">
                      <span className={`badge ${p.type === 'FROM_SHOPKEEPER' ? 'badge-success' : 'badge-danger'}`}>
                        {p.type === 'FROM_SHOPKEEPER' ? '↓ Received' : '↑ Paid Out'}
                      </span>
                    </td>
                    <td data-label="Party"><strong>{p.type === 'FROM_SHOPKEEPER' ? p.shopkeeper?.shopName : p.supplier?.name}</strong></td>
                    <td data-label="Amount"><strong className={p.type === 'FROM_SHOPKEEPER' ? 'text-success' : 'text-danger'}>{formatCurrency(Math.abs(p.amount))}</strong></td>
                    <td data-label="Method"><span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{p.method}</span></td>
                    <td data-label="Notes" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{p.notes || '-'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No payments recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payment</h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="type-toggle">
                  <button type="button" className={`toggle-btn ${payType === 'FROM_SHOPKEEPER' ? 'active' : ''}`} onClick={() => setPayType('FROM_SHOPKEEPER')}>
                    ↓ Received from Shopkeeper
                  </button>
                  <button type="button" className={`toggle-btn ${payType === 'TO_SUPPLIER' ? 'active' : ''}`} onClick={() => setPayType('TO_SUPPLIER')}>
                    ↑ Paid to Supplier
                  </button>
                </div>
                {payType === 'FROM_SHOPKEEPER' ? (
                  <div className="input-group">
                    <label>Shopkeeper</label>
                    <select value={shopkeeperId} onChange={e => setShopkeeperId(e.target.value)} required>
                      <option value="">-- Select Shopkeeper --</option>
                      {shopkeepers.filter(sk => !sk.isOwnShop).map(sk => <option key={sk.id} value={sk.id}>{sk.shopName}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="input-group">
                    <label>Supplier</label>
                    <select value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="input-group">
                  <label>Amount (PKR)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 25000" required />
                </div>
                <div className="input-group">
                  <label>Payment Method</label>
                  <select value={method} onChange={e => setMethod(e.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="EASYPAISA">EasyPaisa</option>
                    <option value="JAZZCASH">JazzCash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Notes</label>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Transaction ref, cheque number..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .payments-page { display: flex; flex-direction: column; gap: 20px; }
        .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
        .kpi-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; }
        .kpi-card.success { border-left: 4px solid var(--success); }
        .kpi-card.success > svg { color: var(--success); }
        .kpi-card.danger { border-left: 4px solid var(--danger); }
        .kpi-card.danger > svg { color: var(--danger); }
        .kpi-card div { display: flex; flex-direction: column; gap: 4px; }
        .kpi-card span { font-size: 0.8125rem; color: var(--text-muted); font-weight: 600; }
        .kpi-card strong { font-size: 1.4rem; font-weight: 800; }
        .toolbar { display: flex; align-items: center; justify-content: space-between; }
        .toolbar h3 { font-size: 1.1rem; font-weight: 700; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .table-card { }
        .text-success { color: var(--success); }
        .text-danger { color: var(--danger); }
        .spinner-center { display: flex; justify-content: center; padding: 40px; }
        .spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-card { background: var(--bg-card); border: 1px solid var(--border); width: 100%; max-width: 440px; border-radius: 20px; box-shadow: var(--shadow-lg); overflow: hidden; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); font-weight: 700; }
        .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .modal-footer { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }
        .type-toggle { display: flex; gap: 6px; }
        .toggle-btn { flex: 1; padding: 10px; border-radius: 10px; border: 2px solid var(--border); font-size: 0.8125rem; font-weight: 600; transition: all 0.2s; }
        .toggle-btn.active { border-color: var(--primary); background: var(--primary-light); color: var(--primary); }
        [data-theme="dark"] .toggle-btn.active { background: rgba(129, 140, 248, 0.1); }
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-group label { font-size: 0.8125rem; font-weight: 600; }
        .input-group input, .input-group select, .input-group textarea { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--background); outline: none; font-size: 0.875rem; }
        .input-group input:focus, .input-group select:focus, .input-group textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
      `}</style>
    </div>
  );
}
