'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Save, Download, Upload, RefreshCw, Shield } from 'lucide-react';
import { ToastContainer, ToastMessage } from '@/components/Toast';

export default function SettingsPage() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [taxRate, setTaxRate] = useState('0');
  const [invoiceFooter, setInvoiceFooter] = useState('');

  const addToast = (text: string, type: 'success' | 'warning' | 'error') => {
    setToasts(prev => [...prev, { id: Math.random().toString(), text, type }]);
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const s = data.settings;
          setBusinessName(s.businessName || '');
          setPhone(s.phone || '');
          setAddress(s.address || '');
          setCurrency(s.currency || 'PKR');
          setTaxRate(s.taxRate?.toString() || '0');
          setInvoiceFooter(s.invoiceFooter || '');
        }
      } catch { addToast('Failed to load settings.', 'error'); }
      finally { setLoading(false); }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, phone, address, currency, taxRate: parseFloat(taxRate) || 0, invoiceFooter })
      });
      if (res.ok) {
        addToast('Business settings saved successfully.', 'success');
      } else {
        addToast('Failed to save settings.', 'error');
      }
    } catch { addToast('Network error saving settings.', 'error'); }
    finally { setSaving(false); }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tabs-pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Database backup downloaded successfully.', 'success');
      } else {
        addToast('Backup failed. Please try again.', 'error');
      }
    } catch { addToast('Network error during backup.', 'error'); }
  };

  const handleRestore = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!confirm('⚠️ WARNING: Restoring from backup will COMPLETELY WIPE all current data and replace it with the backup. This action cannot be undone. Are you absolutely sure?')) return;
      try {
        const text = await file.text();
        const backupData = JSON.parse(text);
        const res = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backup: backupData })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          addToast('Database restored successfully! Reloading...', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          addToast(data.error || 'Restore failed.', 'error');
        }
      } catch { addToast('Invalid backup file or network error.', 'error'); }
    };
    input.click();
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="settings-page">
      <ToastContainer toasts={toasts} onClose={id => setToasts(p => p.filter(t => t.id !== id))} />

      <div className="settings-grid">
        {/* Business Settings */}
        <form className="card settings-card" onSubmit={handleSaveSettings}>
          <div className="card-header">
            <Settings size={20} className="card-icon" />
            <h3>Business Configuration</h3>
          </div>

          <div className="settings-body">
            <div className="input-group">
              <label>Business Name</label>
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Al-Hamza Tablet Distribution" />
            </div>
            <div className="input-grid">
              <div className="input-group">
                <label>Phone Number</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0300-1234567" />
              </div>
              <div className="input-group">
                <label>Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="PKR">PKR — Pakistani Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="AED">AED — UAE Dirham</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label>Business Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Hall Road, Lahore, Pakistan" />
            </div>
            <div className="input-group">
              <label>Default Tax Rate (%)</label>
              <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} min="0" max="100" step="0.1" />
            </div>
            <div className="input-group">
              <label>Invoice Footer Message</label>
              <textarea rows={2} value={invoiceFooter} onChange={e => setInvoiceFooter(e.target.value)} placeholder="e.g. Thank you for your business!" />
            </div>
          </div>

          <button type="submit" className="btn-primary save-btn" disabled={saving}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </form>

        {/* Backup & Restore */}
        <div className="settings-sidebar">
          <div className="card backup-card">
            <div className="card-header">
              <Shield size={20} className="card-icon" />
              <h3>Data Backup & Recovery</h3>
            </div>
            <div className="backup-body">
              <p>Regularly export your database backup to protect your business data. A JSON file will be downloaded to your device.</p>
              <button className="btn-primary backup-btn" onClick={handleBackup}>
                <Download size={18} />
                <span>Export Database Backup</span>
              </button>
              <div className="divider"></div>
              <p className="restore-warning">⚠️ Restore will completely replace all current data with the backup file contents.</p>
              <button className="btn-secondary restore-btn" onClick={handleRestore}>
                <Upload size={18} />
                <span>Restore from Backup File</span>
              </button>
            </div>
          </div>

          <div className="card info-card">
            <div className="card-header">
              <RefreshCw size={20} className="card-icon" />
              <h3>App Information</h3>
            </div>
            <div className="info-body">
              <div className="info-row"><span>App Name</span><strong>Tabs POS</strong></div>
              <div className="info-row"><span>Version</span><strong>1.0.0</strong></div>
              <div className="info-row"><span>Database</span><strong>SQLite (Local)</strong></div>
              <div className="info-row"><span>Framework</span><strong>Next.js 16</strong></div>
              <div className="info-row"><span>ORM</span><strong>Prisma 5.22</strong></div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-page { display: flex; flex-direction: column; gap: 20px; }
        .settings-grid { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: start; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .card-header { display: flex; align-items: center; gap: 10px; padding: 20px; border-bottom: 1px solid var(--border); }
        .card-header h3 { font-size: 1rem; font-weight: 700; }
        .card-icon { color: var(--primary); }
        .settings-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-group label { font-size: 0.8125rem; font-weight: 600; }
        .input-group input, .input-group select, .input-group textarea { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--background); font-size: 0.875rem; outline: none; }
        .input-group input:focus, .input-group select:focus, .input-group textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .save-btn { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 20px; padding: 12px; border-radius: 12px; }
        .settings-sidebar { display: flex; flex-direction: column; gap: 16px; }
        .backup-card .backup-body, .info-card .info-body { padding: 20px; }
        .backup-body { display: flex; flex-direction: column; gap: 14px; }
        .backup-body p { font-size: 0.875rem; color: var(--text-muted); line-height: 1.5; }
        .backup-btn, .restore-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 12px; font-weight: 600; }
        .divider { height: 1px; background: var(--border); }
        .restore-warning { color: var(--warning); font-weight: 500; }
        .info-body { display: flex; flex-direction: column; gap: 10px; }
        .info-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; padding: 8px 0; border-bottom: 1px dashed var(--border); }
        .info-row:last-child { border-bottom: none; }
        .info-row span { color: var(--text-muted); }
        .loading { display: flex; justify-content: center; padding: 60px; }
        .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .settings-grid { grid-template-columns: 1fr; } .input-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
