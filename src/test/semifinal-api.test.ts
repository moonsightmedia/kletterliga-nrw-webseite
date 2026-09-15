import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { rpc } }));

import {
  cancelSemifinalRegistration,
  getSemifinalRegistrationError,
  getSemifinalRegistrationState,
  isSemifinalRegistrationState,
  registerForSemifinal,
} from "@/services/semifinalApi";

const state = {
  eligible: false,
  eligibility_status: "pending",
  registered: false,
  registration_open: false,
  registration_deadline: "2026-09-27T22:00:00+00:00",
  finale_date: "2026-10-03",
  season_year: "2026",
  league: null,
  class_label: null,
};

describe("semifinal RPC contract", () => {
  beforeEach(() => rpc.mockReset());

  it("uses an identity-free state RPC and validates the response", async () => {
    rpc.mockResolvedValue({ data: state, error: null });
    await expect(getSemifinalRegistrationState()).resolves.toEqual(state);
    expect(rpc).toHaveBeenCalledWith("get_semifinal_registration_state");
  });

  it("registers and cancels only through identity-free server RPCs", async () => {
    rpc.mockResolvedValue({ data: state, error: null });
    await registerForSemifinal();
    await cancelSemifinalRegistration();
    expect(rpc.mock.calls).toEqual([["register_for_semifinal"], ["cancel_semifinal_registration"]]);
  });

  it("fails closed when the RPC is unavailable", async () => {
    const error = { code: "PGRST202", message: "function not found" };
    rpc.mockResolvedValue({ data: null, error });
    await expect(getSemifinalRegistrationState()).rejects.toEqual(error);
  });

  it.each([null, {}, { ...state, eligible: "true" }, { ...state, eligibility_status: "approved" },
    { ...state, league: "anything" }, { ...state, registration_open: null }])(
    "rejects malformed states without claiming successful registration", async (data) => {
      expect(isSemifinalRegistrationState(data)).toBe(false);
      rpc.mockResolvedValue({ data, error: null });
      await expect(registerForSemifinal()).rejects.toThrow("nicht sicher geladen");
    },
  );

  it("does not claim that an error response means a registration was lost", () => {
    expect(getSemifinalRegistrationError(new Error("Network Error"))).toContain("lade den Status neu");
  });

  it("maps authorization failures to useful non-sensitive feedback", () => {
    expect(getSemifinalRegistrationError({ message: "SEMIFINAL_REGISTRATION_CLOSED" })).toContain("geschlossen");
    expect(getSemifinalRegistrationError({ message: "SEMIFINAL_NOT_ELIGIBLE" })).toContain("nicht freigegeben");
    expect(getSemifinalRegistrationError({ message: "AUTHENTICATION_REQUIRED" })).toContain("erneut an");
    expect(getSemifinalRegistrationError({ message: "private backend detail" })).not.toContain("private backend detail");
  });
});
