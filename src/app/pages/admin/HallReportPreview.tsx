import { AdminShell } from "@/app/layouts/AdminLayout";
import HallReport, { type HallReportSource } from "@/hallenrunde/HallReport";

const loadPreview: HallReportSource = async signal => {
  const response = await fetch("/__hallenrunde/overview", { signal });
  if (!response.ok) throw new Error("Die lokale Übersicht konnte nicht geladen werden.");
  return response.json();
};

export default function HallReportPreview() {
  return (
    <AdminShell role="league_admin" previewPath="/app/admin/league/hallenrunde-2027">
      <p className="mb-5 border-l-4 border-[#a15523] bg-[#f8f1e3] px-4 py-3 text-sm">
        <strong>Lokale Vorschau</strong> · Rückmeldungen hier dienen dem Test. <a className="underline" href="/hallen/2027/">Zum Testformular</a>
      </p>
      <HallReport source={loadPreview} />
    </AdminShell>
  );
}
