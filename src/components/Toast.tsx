'use client';

import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'warning' | 'error';
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
  duration?: number;
}

export default function Toast({ message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(message.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [message.id, onClose, duration]);

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <CheckCircle size={18} className="toast-icon success" />;
      case 'warning':
        return <AlertTriangle size={18} className="toast-icon warning" />;
      case 'error':
        return <AlertCircle size={18} className="toast-icon error" />;
    }
  };

  return (
    <div className={`toast-bubble ${message.type} animate-fade-in`}>
      {getIcon()}
      <span className="toast-text">{message.text}</span>
      <button onClick={() => onClose(message.id)} className="toast-close">
        <X size={14} />
      </button>

      <style jsx>{`
        .toast-bubble {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-lg);
          max-width: 320px;
          pointer-events: auto;
          transition: all 0.25s;
        }

        .toast-bubble.success {
          border-left: 4px solid var(--success);
        }
        .toast-bubble.warning {
          border-left: 4px solid var(--warning);
        }
        .toast-bubble.error {
          border-left: 4px solid var(--danger);
        }

        .toast-icon.success { color: var(--success); }
        .toast-icon.warning { color: var(--warning); }
        .toast-icon.error { color: var(--danger); }

        .toast-text {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--foreground);
          flex: 1;
        }

        .toast-close {
          color: var(--text-muted);
          padding: 2px;
          border-radius: 4px;
        }

        .toast-close:hover {
          background: var(--bg-active);
          color: var(--foreground);
        }
      `}</style>
    </div>
  );
}

// Simple Toast Manager Helper (to overlay notifications)
export function ToastContainer({ toasts, onClose }: { toasts: ToastMessage[]; onClose: (id: string) => void }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <Toast key={t.id} message={t} onClose={onClose} />
      ))}
      <style jsx>{`
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 1100;
          pointer-events: none;
        }
        @media (max-width: 480px) {
          .toast-container {
            top: auto;
            bottom: 80px;
            left: 20px;
            right: 20px;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}
