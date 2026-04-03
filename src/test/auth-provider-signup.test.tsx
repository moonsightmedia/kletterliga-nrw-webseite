import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/app/auth/AuthProvider";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

const appApiMocks = vi.hoisted(() => ({
  fetchProfile: vi.fn(),
  upsertProfile: vi.fn(),
  fetchProfileConsent: vi.fn(),
  upsertProfileConsent: vi.fn(),
  initializeParticipantConsent: vi.fn(),
  requestSignupEmail: vi.fn(),
  requestPasswordRecoveryEmail: vi.fn(),
  requestConfirmationResendEmail: vi.fn(),
  resendMarketingOptInEmail: vi.fn(),
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
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock("@/services/appApi", () => ({
  fetchProfile: appApiMocks.fetchProfile,
  fetchProfileConsent: appApiMocks.fetchProfileConsent,
  initializeParticipantConsent: appApiMocks.initializeParticipantConsent,
  requestSignupEmail: appApiMocks.requestSignupEmail,
  requestPasswordRecoveryEmail: appApiMocks.requestPasswordRecoveryEmail,
  requestConfirmationResendEmail: appApiMocks.requestConfirmationResendEmail,
  resendMarketingOptInEmail: appApiMocks.resendMarketingOptInEmail,
  upsertProfile: appApiMocks.upsertProfile,
  upsertProfileConsent: appApiMocks.upsertProfileConsent,
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
            requiredConsentAccepted: true,
            marketingOptInRequested: false,
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

const MarketingHarness = () => {
  const { signUp } = useAuth();
  const [message, setMessage] = useState("idle");

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const result = await signUp({
            email: "marketing@example.com",
            password: "supersecret",
            firstName: "Jana",
            lastName: "Muster",
            birthDate: "2000-01-01",
            gender: "w",
            homeGymId: null,
            league: "toprope",
            requiredConsentAccepted: true,
            marketingOptInRequested: true,
          });
          setMessage(
            result.error ??
              `${String(result.marketingOptInEmailSent)}:${result.marketingOptInEmailError ?? "ok"}`,
          );
        }}
      >
        Sign up marketing
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
    appApiMocks.fetchProfileConsent.mockResolvedValue({ data: null, error: null });
    appApiMocks.upsertProfileConsent.mockResolvedValue({ data: null, error: null });
    appApiMocks.initializeParticipantConsent.mockResolvedValue({
      data: { ok: true, email_sent: true, marketing_email_status: "pending", consent: null },
      error: null,
    });
    appApiMocks.requestSignupEmail.mockResolvedValue({
      data: { ok: true, email_sent: true, user_id: "new-user" },
      error: null,
    });
    appApiMocks.requestPasswordRecoveryEmail.mockResolvedValue({
      data: { ok: true, email_sent: true },
      error: null,
    });
    appApiMocks.requestConfirmationResendEmail.mockResolvedValue({
      data: { ok: true, email_sent: true },
      error: null,
    });
    appApiMocks.resendMarketingOptInEmail.mockResolvedValue({
      data: { ok: true, email_sent: true, marketing_email_status: "pending", consent: null },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns a clear error when signup reports an existing confirmed account", async () => {
    appApiMocks.requestSignupEmail.mockResolvedValue({
      data: null,
      error: {
        message:
          "Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich im Login an oder fordere dort einen neuen Bestaetigungslink an.",
      },
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() =>
      expect(
        screen.getByText(/Diese E-Mail-Adresse ist bereits registriert\./),
      ).toBeInTheDocument(),
    );
  });

  it("surfaces a helpful outage message when signup mail delivery fails", async () => {
    appApiMocks.requestSignupEmail.mockResolvedValue({
      data: null,
      error: { message: "Unser E-Mail-Versand ist gerade gestoert." },
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() =>
      expect(
        screen.getByText(/Unser E-Mail-Versand ist gerade gestoert\./),
      ).toBeInTheDocument(),
    );
  });

  it("keeps signup successful when the optional marketing DOI mail cannot be sent", async () => {
    appApiMocks.requestSignupEmail.mockResolvedValue({
      data: {
        ok: true,
        email_sent: true,
        user_id: "new-user",
      },
      error: null,
    });
    appApiMocks.initializeParticipantConsent.mockResolvedValue({
      data: {
        ok: true,
        email_sent: false,
        marketing_email_status: "pending",
        consent: null,
        message: "Die Bestaetigungs-E-Mail konnte gerade nicht gesendet werden.",
      },
      error: null,
    });

    render(
      <AuthProvider>
        <MarketingHarness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign up marketing" }));

    await waitFor(() =>
      expect(
        screen.getByText("false:Die Bestaetigungs-E-Mail konnte gerade nicht gesendet werden."),
      ).toBeInTheDocument(),
    );
  });

  it("surfaces a helpful outage message when password reset mail delivery fails", async () => {
    appApiMocks.requestPasswordRecoveryEmail.mockResolvedValue({
      data: null,
      error: { message: "Unser E-Mail-Versand ist gerade gestoert." },
    });

    render(
      <AuthProvider>
        <ResetHarness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() =>
      expect(
        screen.getByText(/Unser E-Mail-Versand ist gerade gestoert\./),
      ).toBeInTheDocument(),
    );
  });

  it("surfaces a helpful outage message when resending confirmation mail fails", async () => {
    appApiMocks.requestConfirmationResendEmail.mockResolvedValue({
      data: null,
      error: { message: "Unser E-Mail-Versand ist gerade gestoert." },
    });

    render(
      <AuthProvider>
        <ResendHarness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));

    await waitFor(() =>
      expect(
        screen.getByText(/Unser E-Mail-Versand ist gerade gestoert\./),
      ).toBeInTheDocument(),
    );
  });
});
