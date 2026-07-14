'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Tablet, AlertCircle, ChevronDown, ChevronUp, DollarSign, Calendar, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SearchResult {
  modelId: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  color: string;
  locations: {
    locationName: string;
    locationType: 'WAREHOUSE' | 'SHOPKEEPER' | 'OWN_SHOP';
    count: number;
    instances: {
      imei: string;
      serialNumber: string | null;
      purchasePrice: number;
      sellingPrice: number | null;
      qcStatus: string;
      status: string;
      createdAt: string;
      purchaseInvoiceNo: string | null;
      shopkeeperBalance: number | null;
    }[];
  }[];
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Handle hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Debounced search fetching
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  if (!isOpen) return null;

  const toggleModel = (modelId: string) => {
    setExpandedModels((prev) => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  const toggleLocation = (key: string) => {
    setExpandedLocations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="search-backdrop" onClick={onClose}>
      <div className="search-container animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="search-header">
          <Search className="search-bar-icon" size={22} />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search by brand, model, IMEI, or serial number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="search-body">
          {loading && (
            <div className="search-loading">
              <div className="search-spinner"></div>
              <span>Searching tablet database...</span>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="search-empty">
              <AlertCircle size={32} />
              <p>No tablets match "{query}"</p>
              <span>Try entering a brand (Samsung), a model (Tab A9), or an IMEI number.</span>
            </div>
          )}

          {!loading && !query && (
            <div className="search-help">
              <Tablet size={32} />
              <p>Global Tablet Locator</p>
              <span>Search a tablet's IMEI to instantly locate it in the Warehouse, in Own Shop, or at any Shopkeeper.</span>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="search-results">
              {results.map((item) => {
                const isModelExpanded = !!expandedModels[item.modelId];
                const totalStock = item.locations.reduce((acc, loc) => acc + loc.count, 0);

                return (
                  <div key={item.modelId} className="result-card">
                    <div className="result-model-header" onClick={() => toggleModel(item.modelId)}>
                      <div className="result-model-info">
                        <Tablet className="icon-tablet" size={20} />
                        <div>
                          <h3>{item.brand} {item.model}</h3>
                          <span>{item.ram} RAM / {item.storage} Storage • {item.color}</span>
                        </div>
                      </div>
                      <div className="result-model-badge">
                        <span className="badge badge-primary">{totalStock} Available</span>
                        {isModelExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {isModelExpanded && (
                      <div className="result-locations-list">
                        {item.locations.map((loc) => {
                          const locKey = `${item.modelId}-${loc.locationName}`;
                          const isLocExpanded = !!expandedLocations[locKey];

                          return (
                            <div key={loc.locationName} className="location-group">
                              <div className="location-header" onClick={() => toggleLocation(locKey)}>
                                <div className="location-name">
                                  <MapPin size={16} />
                                  <span>{loc.locationName}</span>
                                  <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                                    {loc.locationType}
                                  </span>
                                </div>
                                <div className="location-qty">
                                  <span>{loc.count} tablets</span>
                                  {isLocExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                              </div>

                              {isLocExpanded && (
                                <table className="instances-table">
                                  <thead>
                                    <tr>
                                      <th>IMEI / Serial</th>
                                      <th>Purchase Price</th>
                                      <th>Owner Sell Price</th>
                                      <th>QC Status</th>
                                      <th>Date Added</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {loc.instances.map((inst) => (
                                      <tr key={inst.imei}>
                                        <td>
                                          <div className="imei-field">
                                            <strong>{inst.imei}</strong>
                                            {inst.serialNumber && <span>S/N: {inst.serialNumber}</span>}
                                          </div>
                                        </td>
                                        <td>{formatCurrency(inst.purchasePrice)}</td>
                                        <td>{inst.sellingPrice ? formatCurrency(inst.sellingPrice) : <span className="text-muted">Not Set</span>}</td>
                                        <td>
                                          <span className={`badge ${
                                            inst.qcStatus === 'CHECKED_OK' ? 'badge-success' : 
                                            inst.qcStatus === 'FAULTY' ? 'badge-danger' : 'badge-warning'
                                          }`}>
                                            {inst.qcStatus}
                                          </span>
                                        </td>
                                        <td>{formatDate(inst.createdAt)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .search-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 80px 20px 20px 20px;
          z-index: 1000;
        }

        .search-container {
          background: var(--bg-card);
          width: 100%;
          max-width: 780px;
          border-radius: 20px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-lg), var(--shadow-glow);
          display: flex;
          flex-direction: column;
          max-height: 80vh;
          overflow: hidden;
        }

        .search-header {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          gap: 14px;
        }

        .search-bar-icon {
          color: var(--text-muted);
        }

        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 1.1rem;
          outline: none;
          color: var(--foreground);
        }

        .search-close-btn {
          color: var(--text-muted);
          padding: 6px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .search-close-btn:hover {
          background: var(--bg-active);
          color: var(--foreground);
        }

        .search-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          min-height: 200px;
        }

        .search-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 60px 0;
          color: var(--text-muted);
        }

        .search-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .search-empty, .search-help {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 10px;
          padding: 60px 20px;
          color: var(--text-muted);
        }

        .search-empty p, .search-help p {
          font-weight: 600;
          font-size: 1.1rem;
          color: var(--foreground);
          margin-top: 6px;
        }

        .search-empty span, .search-help span {
          font-size: 0.875rem;
          max-width: 400px;
        }

        .search-results {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .result-card {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .result-model-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .result-model-header:hover {
          background: var(--bg-active);
        }

        .result-model-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .icon-tablet {
          color: var(--primary);
        }

        .result-model-info h3 {
          font-size: 1rem;
          font-weight: 700;
        }

        .result-model-info span {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .result-model-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-muted);
        }

        .result-locations-list {
          border-top: 1px solid var(--border);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--bg-card);
        }

        .location-group {
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }

        .location-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--background);
          cursor: pointer;
          transition: background 0.2s;
        }

        .location-header:hover {
          background: var(--bg-active);
        }

        .location-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .location-qty {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .instances-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
          text-align: left;
        }

        .instances-table th {
          background: var(--bg-active);
          padding: 8px 12px;
          font-weight: 600;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
        }

        .instances-table td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--border);
        }

        .instances-table tr:last-child td {
          border-bottom: none;
        }

        .imei-field {
          display: flex;
          flex-direction: column;
        }

        .imei-field span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .search-backdrop {
            padding: 20px 10px;
          }
          .search-container {
            max-height: 90vh;
          }
          .instances-table {
            display: block;
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}
