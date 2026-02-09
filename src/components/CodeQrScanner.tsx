import { useEffect, useId, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface CodeQrScannerProps {
  /** Called when a code was successfully scanned. Parent should close the dialog and use the value. */
  onScan: (value: string) => void;
  /** Optional: called when scanner fails (e.g. no camera). */
  onError?: (message: string) => void;
}

/**
 * Renders a full-screen QR/Barcode scanner using the device camera.
 * On success, calls onScan(decodedText). Use inside a Dialog; cleanup runs on unmount.
 */
export function CodeQrScanner({ onScan, onError }: CodeQrScannerProps) {
  const id = useId().replace(/:/g, "-");
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1,
    };
    const scanner = new Html5QrcodeScanner(id, config, false);

    const onSuccess = (decodedText: string) => {
      onScanRef.current(decodedText);
    };

    const onScanError = () => {
      // Ignore repeated "No QR code found" while scanning
    };

    scanner.render(onSuccess, onScanError);

    return () => {
      scanner.clear().catch((e) => {
        onErrorRef.current?.(String(e));
      });
    };
  }, [id]);

  return <div id={id} className="min-h-[280px] w-full" />;
}
