export function isIdeasSurveyPath(path: string): boolean {
  return /^\/(?:saison\/2027|ideen-2027(?:\/widerruf)?)\/?$/.test(path);
}

// Also filters scripts already injected by a previous client-side route.
export function filterSurveyTelemetry<T extends { url: string }>(event: T): T | null {
  try { return isIdeasSurveyPath(new URL(event.url, "https://www.kletterliga-nrw.de").pathname) ? null : event; }
  catch { return null; }
}
