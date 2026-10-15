import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ value: { user: null as null | { id: string }, loading: false, role: null as string | null, hasAcceptedRequiredConsents: true } }));
vi.mock("@/app/auth/AuthProvider", () => ({ useAuth: () => auth.value }));
import { ProtectedRoute, RoleGuard } from "@/app/auth/ProtectedRoute";
import { IdeasSurveyDashboard } from "@/app/pages/admin/LeagueIdeasSurvey";
import { emptyIdeasReportFilters } from "@/services/ideasSurveyAdminApi";
import { makeIdeasPreviewReport } from "@/app/pages/admin/ideasSurveyPreviewData";
afterEach(cleanup);
const mount = () => {
  const source = vi.fn().mockResolvedValue(makeIdeasPreviewReport(emptyIdeasReportFilters, []));
  render(<MemoryRouter initialEntries={["/app/admin/league/ideas-2027"]}><Routes><Route path="/app/admin/league/ideas-2027" element={<ProtectedRoute><RoleGuard allow={["league_admin"]}><IdeasSurveyDashboard source={source} /></RoleGuard></ProtectedRoute>} /><Route path="/app/login" element={<p>Anmelden</p>} /><Route path="/app" element={<p>Teilnehmerbereich</p>} /></Routes></MemoryRouter>);
  return source;
};
describe("ideas report route access", () => {
  it("sends anonymous visitors to login without requesting answers", () => {
    auth.value = { user: null, loading: false, role: null, hasAcceptedRequiredConsents: true };
    const source = mount(); expect(screen.getByText("Anmelden")).toBeInTheDocument(); expect(source).not.toHaveBeenCalled();
  });
  it.each(["participant", "gym_admin"])("does not fetch private answers for %s", role => {
    auth.value = { user: { id: "test" }, loading: false, role, hasAcceptedRequiredConsents: true };
    const source = mount(); expect(screen.getByText("Teilnehmerbereich")).toBeInTheDocument(); expect(source).not.toHaveBeenCalled();
  });
  it("lets a league admin request the protected report", async () => {
    auth.value = { user: { id: "test" }, loading: false, role: "league_admin", hasAcceptedRequiredConsents: true };
    const source = mount(); await screen.findByText("Noch keine Einsendungen"); expect(source).toHaveBeenCalledTimes(1);
  });
});
