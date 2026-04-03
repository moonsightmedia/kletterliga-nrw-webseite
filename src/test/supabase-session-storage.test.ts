import { shouldDiscardStoredSupabaseSession } from "@/services/supabase";

describe("shouldDiscardStoredSupabaseSession", () => {
  it("keeps valid-looking JWT sessions", () => {
    const value = JSON.stringify({
      access_token: "header.payload.signature",
      refresh_token: "refresh-token",
      expires_at: 1234567890,
    });

    expect(shouldDiscardStoredSupabaseSession(value)).toBe(false);
  });

  it("rejects malformed JSON", () => {
    expect(shouldDiscardStoredSupabaseSession("{invalid-json")).toBe(true);
  });

  it("rejects sessions whose access token is not a JWT", () => {
    const value = JSON.stringify({
      access_token: "not-a-jwt",
      refresh_token: "refresh-token",
      expires_at: 1234567890,
    });

    expect(shouldDiscardStoredSupabaseSession(value)).toBe(true);
  });
});
