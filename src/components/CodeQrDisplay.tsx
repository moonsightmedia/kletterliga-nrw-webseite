import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

interface CodeQrDisplayProps {
  /** Code string to encode (e.g. Hallen-Code or Mastercode). */
  value: string;
  /** Size in pixels. Default 128. */
  size?: number;
  className?: string;
}

/**
 * Renders a QR code image for the given code string.
 * Participants can scan this to fill the code input instead of typing.
 */
export function CodeQrDisplay({ value, size = 128, className }: CodeQrDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value.trim()) {
      setDataUrl(null);
      return;
    }
    setError(false);
    QRCode.toDataURL(value.trim(), { width: size, margin: 1 })
      .then(setDataUrl)
      .catch(() => setError(true));
  }, [value, size]);

  if (error) return null;
  if (!dataUrl) return <div className={cn("bg-muted animate-pulse rounded", className)} style={{ width: size, height: size }} />;
  return (
    <img
      src={dataUrl}
      alt={`QR-Code für ${value}`}
      className={cn("rounded border border-border bg-white", className)}
      width={size}
      height={size}
    />
  );
}
