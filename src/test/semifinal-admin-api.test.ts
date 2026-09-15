import { beforeEach, describe, expect, it, vi } from "vitest";
const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { from, rpc } }));
import { adminCancelSemifinalRegistration, listAdminSemifinalRegistrations, selectCurrentSemifinalRegistrations } from "@/services/semifinalAdminApi";

const registration = {
  id: "reg-current", profile_id: "participant-one", season_year: "2026", registration_status: "registered" as const,
  created_at: "2026-09-14T12:00:00Z", profiles: { id: "participant-one", first_name: "Mika", last_name: "Testperson", email: "synthetic@test.invalid", role: "participant", archived_at: null, participation_activated_at: "2026-05-01T10:00:00Z" },
};
const approval = { profile_id: registration.profile_id, season_year: "2026", status: "eligible" as const, league: "lead" as const, class_label: "Freigegebene Klasse" };

describe("admin semifinal list", () => {
  beforeEach(() => { from.mockReset(); rpc.mockReset(); });

  it("excludes cancelled registrations and other seasons", () => {
    const result = selectCurrentSemifinalRegistrations([
      registration, { ...registration, id: "cancelled", registration_status: "cancelled" },
      { ...registration, id: "old-season", season_year: "2025" },
    ], [approval], "2026");
    expect(result.map((row) => row.id)).toEqual([registration.id]);
    expect(result[0]).toMatchObject({ approved_league: "lead", approved_class_label: "Freigegebene Klasse" });
  });

  it("does not use another season's approval or infer a class without a snapshot", () => {
    const [row] = selectCurrentSemifinalRegistrations([registration], [{ ...approval, season_year: "2025" }], "2026");
    expect(row).toMatchObject({ approved_league: null, approved_class_label: null, eligibility_status: "pending" });
  });

  it.each([
    { archived_at: "2026-09-15T10:00:00Z" },
    { participation_activated_at: null },
    { role: "gym_admin" },
  ])("shows a review state when an approved registration is no longer an active participant: %j", (patch) => {
    const [row] = selectCurrentSemifinalRegistrations([{ ...registration, profiles: { ...registration.profiles, ...patch } }], [approval], "2026");
    expect(row.eligibility_status).toBe("pending");
    expect(row.approved_class_label).toBe("Freigegebene Klasse");
    expect(row.approved_league).toBe("lead");
  });

  it("rejects old schema data instead of reporting an empty confirmed list", () => {
    expect(() => selectCurrentSemifinalRegistrations([{ ...registration, season_year: undefined } as unknown as typeof registration], [], "2026")).toThrow("unvollständig");
    expect(() => selectCurrentSemifinalRegistrations([registration], [], "")).toThrow("Saison fehlt");
  });

  it("propagates query/schema errors", async () => {
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: null, error: { code: "42703", message: "missing column" } }) };
    from.mockReturnValue(chain);
    await expect(listAdminSemifinalRegistrations("2026")).rejects.toMatchObject({ code: "42703" });
  });

  it("uses explicit schema columns and server filters, not a broad legacy list", async () => {
    const chains = [registration, approval].map((row) => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: [row], error: null }) }));
    from.mockImplementation((table) => chains[table === "finale_registrations" ? 0 : 1]);
    const result = await listAdminSemifinalRegistrations("2026");
    expect(chains[0].eq.mock.calls).toEqual([["season_year", "2026"], ["registration_status", "registered"]]);
    expect(chains[0].select.mock.calls[0][0]).toContain("registration_status");
    expect(result[0].approved_class_label).toBe("Freigegebene Klasse");
  });

  it("uses admin cancellation RPC and requires a confirmed cancelled response", async () => {
    rpc.mockResolvedValueOnce({ data: { id: registration.id, registration_status: "cancelled" }, error: null });
    await expect(adminCancelSemifinalRegistration(registration.id)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("admin_cancel_semifinal_registration", { p_registration_id: registration.id });
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(adminCancelSemifinalRegistration(registration.id)).rejects.toThrow("nicht sicher bestätigt");
    expect(from).not.toHaveBeenCalled();
  });
});
