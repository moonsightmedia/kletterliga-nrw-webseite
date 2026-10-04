import { supabase } from "./supabase";

export type Certificate = {
  phase: "qualification" | "finale";
  scoring_stage?: "semifinal" | "final";
  season_year: string;
  display_name: string;
  league: "lead" | "toprope";
  class_label: string;
  rank: number;
  issued_at: string;
};

export type MyCertificates = {
  qualification: Certificate | null;
  finale: Certificate | null;
  finale_published_at: string | null;
};

export type CertificatePublication = {
  published_at: string | null;
  revision: number | null;
  certificate_count: number;
  needs_refresh: boolean;
};

const call = async <T,>(name: string, season: string): Promise<T> => {
  const { data, error } = await supabase.rpc(name, { p_season: season });
  if (error) throw error;
  return data as T;
};

export const getMyCertificates = (season: string) => call<MyCertificates>("get_my_certificates", season);
export const getCertificatePublication = (season: string) => call<CertificatePublication>("get_certificate_publication", season);
export const publishFinaleCertificates = (season: string) => call<CertificatePublication>("publish_finale_certificates", season);
