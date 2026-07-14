'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap } from 'lucide-react';

interface MobileScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function MobileScanner({ onScan, onClose }: MobileScannerProps) {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'mobile-scanner-view';

  useEffect(() => {
    // Check if browser supports media devices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      return;
    }

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          setHasCamera(true);
          
          // Select back camera if available, otherwise first camera
          const backCamera = cameras.find(c => 
            c.label.toLowerCase().includes('back') || 
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('environment')
          );
          
          const cameraId = backCamera ? backCamera.id : cameras[0].id;
          
          const html5QrCode = new Html5Qrcode(scannerId);
          qrCodeInstanceRef.current = html5QrCode;
          setIsScanning(true);

          await html5QrCode.start(
            cameraId,
            {
              fps: 15,
              qrbox: (width, height) => {
                // Focus area for scanning barcodes (wider width, shorter height)
                return { width: Math.min(width * 0.8, 300), height: 100 };
              },
              aspectRatio: 1.0
            },
            (decodedText) => {
              // On successful scan
              onScan(decodedText);
              // Stop camera and close
              stopScanner();
              onClose();
            },
            (errorMessage) => {
              // Silent error logs (html5-qrcode prints errors on every empty frame)
            }
          );
        } else {
          setHasCamera(false);
        }
      } catch (err) {
        console.error('Camera scanning initialize error:', err);
        setHasCamera(false);
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
        qrCodeInstanceRef.current = null;
        setIsScanning(false);
      } catch (e) {
        console.error('Failed to stop scanner:', e);
      }
    }
  };

  const toggleTorch = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        const nextTorch = !torchOn;
        // Check if device supports flash
        await qrCodeInstanceRef.current.applyVideoConstraints({
          // @ts-ignore
          advanced: [{ torch: nextTorch }]
        });
        setTorchOn(nextTorch);
      } catch (e) {
        alert('Torch/Flashlight is not supported on this camera device.');
      }
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="scanner-overlay" onClick={handleClose}>
      <div className="scanner-card" onClick={e => e.stopPropagation()}>
        <div className="scanner-header">
          <div className="scanner-title">
            <Camera size={18} />
            <span>Point camera at barcode</span>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="scanner-view-wrapper">
          <div id={scannerId} className="scanner-view"></div>
          
          {/* Virtual targeting frame overlay */}
          <div className="scanner-target-box"></div>
          <div className="scanner-laser-line"></div>
        </div>

        <div className="scanner-footer">
          {hasCamera === false && (
            <div className="scanner-error">
              <span>No camera access detected. Check browser permissions.</span>
            </div>
          )}

          {isScanning && (
            <button className="torch-btn" onClick={toggleTorch}>
              <Zap size={18} className={torchOn ? 'active' : ''} />
              <span>{torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}</span>
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .scanner-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1200;
        }

        .scanner-card {
          background: #111827;
          border: 1px solid #1f2937;
          width: 100%;
          max-width: 450px;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }

        .scanner-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #1f2937;
          color: white;
        }

        .scanner-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .close-btn {
          color: #9ca3af;
          padding: 4px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: #1f2937;
          color: white;
        }

        .scanner-view-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 1.0;
          background: black;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .scanner-view {
          width: 100% !important;
          height: 100% !important;
        }

        /* Target reticle box overlay */
        .scanner-target-box {
          position: absolute;
          width: 280px;
          height: 100px;
          border: 2px solid var(--primary);
          border-radius: 12px;
          pointer-events: none;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
          z-index: 5;
        }

        .scanner-laser-line {
          position: absolute;
          width: 270px;
          height: 2px;
          background-color: #ef4444;
          box-shadow: 0 0 8px #ef4444;
          z-index: 6;
          animation: laserMove 2s infinite ease-in-out;
          pointer-events: none;
        }

        .scanner-footer {
          padding: 16px;
          display: flex;
          justify-content: center;
          background: #111827;
        }

        .scanner-error {
          color: #f87171;
          font-size: 0.8125rem;
          text-align: center;
          padding: 8px;
        }

        .torch-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #1f2937;
          color: white;
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
          border: 1px solid #374151;
        }

        .torch-btn:hover {
          background: #374151;
        }

        .torch-btn :global(.active) {
          color: #fbbf24;
          fill: #fbbf24;
        }

        @keyframes laserMove {
          0%, 100% { transform: translateY(-35px); }
          50% { transform: translateY(35px); }
        }

        @media (max-width: 480px) {
          .scanner-overlay {
            padding: 10px;
          }
          .scanner-target-box {
            width: 85%;
            height: 90px;
          }
          .scanner-laser-line {
            width: 80%;
          }
        }
      `}</style>
    </div>
  );
}
