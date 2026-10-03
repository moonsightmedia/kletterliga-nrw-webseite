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
  request_id: string;
  prize: string;
}
export interface RaffleSource {
  get: (season: string, scope: RaffleScope, presentOnly: boolean) => Promise<RaffleState>;
  draw: (season: string, request: RaffleRequest) => Promise<RaffleDraw>;
}
export const raffleSource: RaffleSource = {
  async get(season, scope, presentOnly) {
    const { data, error } = await supabase.rpc("get_competition_raffle", {
      p_season: season, p_scope: scope, p_present_only: presentOnly, p_repeat_allowed: true,
    });
    if (error) throw new Error(error.message);
    return data as RaffleState;
  },
  async draw(season, request) {
    const { data, error } = await supabase.rpc("draw_competition_raffle", {
      p_season: season, p_scope: request.scope, p_present_only: request.present_only,
      p_request_id: request.request_id, p_prize: request.prize, p_repeat_allowed: true,
    });
    if (error) throw new Error(error.message);
    return data as RaffleDraw;
  },
};
