// Development demo only: synthetic people, isolated storage, no API calls.
import type { AttendanceAction, AttendanceChange, AttendanceData, AttendanceRow } from "@/services/competitionAttendance";
const key = "kletterliga:demo:attendance:v1";
const seed = (): AttendanceData => ({ season: "2026", phase: "open", deadline: "2099-10-03T14:00:00Z", rows: [
  { profile_id: "demo-arrival-1", name: "Mara Beispiel", league: "lead", class_label: "U15-w", registered: true, eligible: true, status: "expected", version: 0, checked_in_at: null, route_count: 5, can_late_register: false },
  { profile_id: "demo-arrival-2", name: "Jonas Muster", league: "toprope", class_label: "Ü15-m", registered: true, eligible: true, status: "expected", version: 0, checked_in_at: null, route_count: 5, can_late_register: false },
  { profile_id: "demo-arrival-3", name: "Alex Nachmeldung", league: "lead", class_label: "Ü40-w", registered: false, eligible: true, status: "expected", version: 0, checked_in_at: null, route_count: 5, can_late_register: true },
] });
function read(): AttendanceData {
  try { const value = JSON.parse(localStorage.getItem(key) ?? "null"); if (Array.isArray(value?.rows)) return value; } catch { /* Reset recoverable demo state. */ }
  return seed();
}
export function resetAttendanceDemo() { localStorage.removeItem(key); }
const requests = new Map<string, { payload: string; response: AttendanceChange }>();
export const demoAttendanceSource = {
  get: async () => read(),
  set: async (_season: string, profile: string, action: AttendanceAction, version: number, requestId: string, reason: string | null) => {
    const payload = JSON.stringify([profile, action, version, reason]);
    const previous = requests.get(requestId);
    if (previous) { if (previous.payload !== payload) throw new Error("Anfrage wurde bereits anders verwendet."); return previous.response; }
    const data = read(); const row = data.rows.find(person => person.profile_id === profile);
    if (!row || row.version !== version) throw new Error("Der Eintrag wurde inzwischen geändert. Bitte aktualisieren und den neuen Stand prüfen.");
    if (["undo", "absent"].includes(action) && !reason?.trim()) throw new Error("Begründung erforderlich.");
    const next: AttendanceRow = { ...row, registered: row.registered || action === "late-register", status: action === "absent" ? "absent" : action === "undo" ? "expected" : "arrived", version: version + 1, checked_in_at: ["arrive", "late-register"].includes(action) ? new Date().toISOString() : null };
    const response: AttendanceChange = { profile_id: profile, status: next.status, registered: next.registered, version: next.version, checked_in_at: next.checked_in_at };
    data.rows = data.rows.map(person => person.profile_id === profile ? next : person);
    localStorage.setItem(key, JSON.stringify(data));
    requests.set(requestId, { payload, response });
    return response;
  },
};
