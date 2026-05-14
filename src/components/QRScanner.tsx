import React, { useState } from 'react';
import { CameraOff } from 'lucide-react';
import BarcodeScannerComponent from "react-qr-barcode-scanner";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export default function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const [errorOccurred, setErrorOccurred] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-900 flex items-center justify-center">
        {!errorOccurred ? (
          <BarcodeScannerComponent
            width="100%"
            height="100%"
            onUpdate={(err, result) => {
              if (result) {
                onScanSuccess(result.getText());
              }
              if (err) {
                // Often noisy frame-by-frame errors, we ignore them unless they are persistent
              }
            }}
            onError={(err: any) => {
              console.error("Camera error:", err);
              setErrorOccurred(true);
              if (onScanError) onScanError("Kamera başlatılamadı. İzinleri kontrol edin.");
            }}
          />
        ) : (
          <div className="p-8 text-center space-y-4 z-10 relative">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto border border-red-500/20">
              <CameraOff size={28} />
            </div>
            <h3 className="text-white font-bold text-lg">Kamera Engellendi</h3>
            <p className="text-xs text-zinc-400 leading-relaxed px-4">
              Yanlışlıkla kamera erişimini reddettiniz. Lütfen adres çubuğundaki 
              <strong className="text-white"> kilit </strong> veya 
              <strong className="text-white"> aA </strong> ikonuna tıklayıp kameraya izin verin.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-zinc-800 text-white rounded-xl text-xs font-bold hover:bg-zinc-700 transition w-full shadow-lg border border-zinc-700"
            >
              İzin Verdim, Yenile
            </button>
          </div>
        )}
        
        {/* Scanner Overlay UI */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[2px] bg-orange-500/50 animate-pulse shadow-[0_0_10px_rgba(249,115,22,1)]" />
          <div className="absolute top-4 left-4 h-8 w-8 border-t-2 border-l-2 border-orange-500 rounded-tl-lg" />
          <div className="absolute top-4 right-4 h-8 w-8 border-t-2 border-r-2 border-orange-500 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-orange-500 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-orange-500 rounded-br-lg" />
        </div>
      </div>
      <p className="mt-4 pb-2 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
        QR Kodu Merkeze Getirin
      </p>
    </div>
  );
}
