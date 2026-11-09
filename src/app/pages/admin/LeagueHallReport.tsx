import { supabase } from "@/services/supabase";
import HallReport, { type HallReportSource } from "@/hallenrunde/HallReport";

const loadReport: HallReportSource = async signal => {
  const { data, error } = await supabase.rpc("admin_hallenrunde_2027_report").abortSignal(signal);
  if (error) throw new Error(error.code === "42501"
    ? "Für diese Übersicht brauchst du einen aktiven Liga-Adminzugang."
    : "Die Rückmeldungen konnten nicht geladen werden. Bitte versuche es erneut.");
  if (!Array.isArray(data)) throw new Error("Die Übersicht konnte nicht gelesen werden.");
  return data;
};

export default function LeagueHallReport() {
  return <HallReport source={loadReport} />;
}
