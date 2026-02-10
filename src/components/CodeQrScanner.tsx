import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface CodeQrScannerProps {
  /** Called when a code was successfully scanned. Parent should close the dialog and use the value. */
  onScan: (value: string) => void;
  /** Optional: called when scanner fails (e.g. no camera). */
  onError?: (message: string) => void;
}

/**
 * Renders a QR/Barcode scanner using the device camera (Low-Level API).
 * On success, calls onScan(decodedText). Use inside a Dialog; cleanup runs on unmount.
 */
export function CodeQrScanner({ onScan, onError }: CodeQrScannerProps) {
  const id = useId().replace(/:/g, "-");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    let isMounted = true;
    const scanner = new Html5Qrcode(id);

    const startScanning = async () => {
      try {
        // Get available cameras
        const cameras = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!cameras || cameras.length === 0) {
          const errorMsg = "Keine Kamera gefunden. Bitte stelle sicher, dass eine Kamera verfügbar ist.";
          setError(errorMsg);
          setLoading(false);
          onErrorRef.current?.(errorMsg);
          return;
        }

        // Prefer back camera (environment), fallback to first available
        const cameraId = cameras.find((cam) => cam.label.toLowerCase().includes("back") || cam.label.toLowerCase().includes("rear"))?.id || cameras[0].id;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          videoConstraints: {
            facingMode: "environment", // Prefer back camera
          },
        };

        // Start scanning
        await scanner.start(
          cameraId,
          config,
          (decodedText) => {
            // Success callback - stop scanner and call onScan
            scanner.stop().then(() => {
              if (isMounted) {
                onScanRef.current(decodedText);
              }
            }).catch(() => {
              // Ignore stop errors, still call onScan
              if (isMounted) {
                onScanRef.current(decodedText);
              }
            });
          },
          () => {
            // Ignore repeated "No QR code found" errors while scanning
          }
        );

        if (isMounted) {
          scannerRef.current = scanner;
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (!isMounted) return;
        const errorMsg = err instanceof Error ? err.message : "Kamera konnte nicht gestartet werden. Bitte Berechtigung erteilen.";
        setError(errorMsg);
        setLoading(false);
        onErrorRef.current?.(errorMsg);
      }
    };

    startScanning();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
          })
          .catch(() => {
            // Ignore cleanup errors
            scannerRef.current?.clear();
          });
        scannerRef.current = null;
      }
    };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-[280px] w-full flex flex-col items-center justify-center p-4 border border-destructive rounded-md bg-destructive/10">
        <p className="text-sm text-destructive font-medium mb-2">Fehler beim Starten der Kamera</p>
        <p className="text-xs text-muted-foreground text-center">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[280px] w-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Kamera wird gestartet...</p>
        </div>
      </div>
    );
  }

  return <div id={id} className="min-h-[280px] w-full rounded-md overflow-hidden" />;
}
