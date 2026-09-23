/** Keep the camera scan area inside narrow mobile viewfinders. */
export function qrScannerBox(width: number, height: number) {
  const side = Math.max(50, Math.min(250, Math.floor(Math.min(width, height) * 0.85)));
  return { width: side, height: side };
}
