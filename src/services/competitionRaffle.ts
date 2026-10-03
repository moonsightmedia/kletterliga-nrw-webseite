import { supabase } from "@/services/supabase";

export type RaffleScope = "all" | "semifinal" | "final";
export interface RaffleEntry {
  profile_id: string;
  name: string;
  visits: number;
  final_registration: boolean;
  tickets: number;
}
export interface RaffleDraw {
  id: string;
  request_id: string;
  profile_id: string;
  winner_name: string;
  tickets: number;
  remaining_tickets?: number | null;
  total_tickets: number;
  pool_count: number;
  scope: RaffleScope;
  present_only: boolean;
  prize: string;
  created_at: string;
}
export interface RaffleState {
  entries: RaffleEntry[];
  history: RaffleDraw[];
  total_tickets: number;
  pool_count: number;
}
export interface RaffleRequest {
  scope: RaffleScope;
  present_only: boolean;
  repeat_allowed: boolean;
  request_id: string;
  prize: string;
}
export interface RaffleSource {
  get: (season: string, scope: RaffleScope, presentOnly: boolean, repeatAllowed: boolean) => Promise<RaffleState>;
  draw: (season: string, request: RaffleRequest) => Promise<RaffleDraw>;
  export?: (season: string) => Promise<RaffleDispatchRow[]>;
}
export interface RaffleDispatchRow {
  id: string;
  profile_id: string;
  winner_name: string;
  email: string | null;
  prize: string | null;
  created_at: string;
  scope: RaffleScope;
}
export function raffleWinnersCsv(rows: RaffleDispatchRow[]) {
  const cell = (value: string | null) => {
    const text = value ?? "";
    const safe = /^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [
    ["Name", "E-Mail", "Gewinn", "Zeitpunkt", "Teilnehmerkreis", "Profil-ID", "Ziehungs-ID"],
    ...rows.map(row => [row.winner_name, row.email, row.prize || "Überraschungsgewinn",
      new Date(row.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
      row.scope === "all" ? "Alle Teilnehmenden" : row.scope === "semifinal" ? "Anwesende" : "Frühere Finalisten-Ziehung",
      row.profile_id, row.id]),
  ].map(row => row.map(cell).join(";")).join("\r\n");
}
export const raffleSource: RaffleSource = {
  async get(season, scope, presentOnly, repeatAllowed) {
    const { data, error } = await supabase.rpc("get_competition_raffle", {
      p_season: season, p_scope: scope, p_present_only: presentOnly, p_repeat_allowed: repeatAllowed,
    });
    if (error) throw new Error(error.message);
    return data as RaffleState;
  },
  async draw(season, request) {
    const { data, error } = await supabase.rpc("draw_competition_raffle", {
      p_season: season, p_scope: request.scope, p_present_only: request.present_only,
      p_request_id: request.request_id, p_prize: request.prize, p_repeat_allowed: request.repeat_allowed,
    });
    if (error) throw new Error(error.message);
    return data as RaffleDraw;
  },
  async export(season) {
    const { data, error } = await supabase.rpc("export_competition_raffle_winners", { p_season: season });
    if (error) throw new Error(error.message);
    return data as RaffleDispatchRow[];
  },
};
