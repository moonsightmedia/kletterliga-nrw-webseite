import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/app/auth/AuthProvider";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
}));

const appApiMocks = vi.hoisted(() => ({
  fetchProfile: vi.fn(),
  upsertProfile: vi.fn(),
}));

vi.mock("@/services/supabase", () => ({
  isSupabaseConfigured: true,
  supabaseConfig: {
    url: "https://example.supabase.co",
    anonKey: "anon-key",
  },
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
      signUp: authMocks.signUp,
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
      resend: authMocks.resend,
    },
  },
}));

vi.mock("@/services/appApi", () => ({
  fetchProfile: appApiMocks.fetchProfile,
  upsertProfile: appApiMocks.upsertProfile,
}));

vi.mock("@/services/authTelemetry", () => ({
  trackAuthEvent: vi.fn(),
}));

vi.mock("@/config/launch", () => ({
  ensureLaunchSettingsLoaded: vi.fn().mockResolvedValue(undefined),
  formatAccountCreationOpenDate: () => "01.04.2026",
  isBeforeAccountCreationOpen: () => false,
}));

const Harness = () => {
  const { signUp } = useAuth();
  const [message, setMessage] = useState("idle");

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const result = await signUp({
            email: "existing@example.com",
            password: "supersecret",
            firstName: "Jana",
            lastName: "Muster",
            birthDate: "2000-01-01",
            gender: "w",
            homeGymId: null,
            league: "toprope",
          });
          setMessage(result.error ?? "success");
        }}
      >
        Sign up
      </button>
      <div>{message}</div>
    </div>
  );
};

const ResetHarness = () => {
  const { resetPassword } = useAuth();
  const [message, setMessage] = useState("idle");

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const result = await resetPassword("existing@example.com");
          setMessage(result.error ?? "success");
        }}
      >
        Reset password
      </button>
      <div>{message}</div>
    </div>
  );
};

const ResendHarness = () => {
  const { resendConfirmation } = useAuth();
  const [message, setMessage] = useState("idle");

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const result = await resendConfirmation("existing@example.com");
          setMessage(result.error ?? "success");
        }}
      >
        Resend confirmation
      </button>
      <div>{message}</div>
    </div>
  );
};

describe("AuthProvider signUp", () => {
  beforeEach(() => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } });
    authMocks.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    appApiMocks.fetchProfile.mockResolvedValue({ data: null, error: null });
    appApiMocks.upsertProfile.mockResolvedValue({ data: null, error: null });
    authMocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    authMocks.resend.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns a clear error when Supabase responds with an obfuscated existing-user signup", async () => {
    authMocks.signUp.mockResolvedValue({
      data: {
        user: {
          id: "existing-user",
          email: "existing@example.com",
          identities: [],
        },
        session: null,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich im Login an oder fordere dort einen neuen Bestätigungslink an.",
        ),
      ).toBeInTheDocument(),
    );
  });

  it("surfaces a helpful outage message when signup mail delivery fails", async () => {
    authMocks.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "unexpected_failure" },
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Unser E-Mail-Versand ist gerade gestört. Bitte versuche es in ein paar Minuten erneut oder melde dich unter info@kletterliga-nrw.de.",
        ),
      ).toBeInTheDocument(),
    );
  });

  it("surfaces a helpful outage message when password reset mail delivery fails", async () => {
    authMocks.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: "Error sending recovery email" },
    });

    render(
      <AuthProvider>
        <ResetHarness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Unser E-Mail-Versand ist gerade gestört. Bitte versuche es in ein paar Minuten erneut oder melde dich unter info@kletterliga-nrw.de.",
        ),
      ).toBeInTheDocument(),
    );
  });

  it("surfaces a helpful outage message when resending confirmation mail fails", async () => {
    authMocks.resend.mockResolvedValue({
      data: {},
      error: { message: "Error sending confirmation email" },
    });

    render(
      <AuthProvider>
        <ResendHarness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Unser E-Mail-Versand ist gerade gestört. Bitte versuche es in ein paar Minuten erneut oder melde dich unter info@kletterliga-nrw.de.",
        ),
      ).toBeInTheDocument(),
    );
  });
});
