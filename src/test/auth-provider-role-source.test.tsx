import { act, render, screen, waitFor } from "@testing-library/react";
import type { Session, User } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "@/app/auth/AuthProvider";
import type { Profile } from "@/services/appTypes";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
}));

const appApiMocks = vi.hoisted(() => ({
  fetchProfile: vi.fn(),
  fetchProfileConsent: vi.fn(),
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
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
      signOut: authMocks.signOut,
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
      resend: authMocks.resend,
    },
  },
}));

vi.mock("@/services/appApi", () => ({
  fetchProfile: appApiMocks.fetchProfile,
  fetchProfileConsent: appApiMocks.fetchProfileConsent,
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

vi.mock("@/app/auth/archivedAccountNotice", () => ({
  markArchivedAccountNotice: vi.fn(),
}));

const createUser = (overrides: Partial<User> = {}) =>
  ({
    id: "user-1",
    email: "user@example.com",
    user_metadata: {},
    ...overrides,
  }) as User;

const createSession = (userOverrides: Partial<User> = {}) =>
  ({
    user: createUser(userOverrides),
  }) as Session;

const createProfile = (overrides: Partial<Profile> = {}) =>
  ({
    id: "user-1",
    email: "user@example.com",
    first_name: null,
    last_name: null,
    avatar_url: null,
    birth_date: null,
    gender: null,
    home_gym_id: null,
    league: null,
    role: "participant",
    ...overrides,
  }) satisfies Profile;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const RoleHarness = () => {
  const { loading, role } = useAuth();
  return <div>{loading ? "loading" : role}</div>;
};

describe("AuthProvider role source", () => {
  let authCallback: ((event: string, session: Session | null) => void) | undefined;

  beforeEach(() => {
    authCallback = undefined;
    authMocks.getSession.mockResolvedValue({ data: { session: null } });
    authMocks.onAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
      authCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });
    authMocks.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    authMocks.signUp.mockResolvedValue({ data: {}, error: null });
    authMocks.signOut.mockResolvedValue({ error: null });
    authMocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    authMocks.resend.mockResolvedValue({ data: {}, error: null });
    appApiMocks.fetchProfile.mockResolvedValue({ data: null, error: null });
    appApiMocks.fetchProfileConsent.mockResolvedValue({ data: null, error: null });
    appApiMocks.upsertProfile.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("derives the current role from the loaded profile instead of auth user metadata", async () => {
    authMocks.getSession.mockResolvedValue({
      data: {
        session: createSession({
          user_metadata: { role: "league_admin" },
        }),
      },
    });
    appApiMocks.fetchProfile.mockResolvedValue({
      data: createProfile({ role: "participant" }),
      error: null,
    });

    render(
      <AuthProvider>
        <RoleHarness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("participant")).toBeInTheDocument());
  });

  it("keeps route guards in loading state during sign-in until the profile finishes loading", async () => {
    const profileRequest = deferred<{ data: Profile; error: null }>();
    appApiMocks.fetchProfile.mockReturnValueOnce(profileRequest.promise);

    render(
      <AuthProvider>
        <RoleHarness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("guest")).toBeInTheDocument());

    await act(async () => {
      authCallback?.(
        "SIGNED_IN",
        createSession({
          user_metadata: { role: "participant" },
        }),
      );
      await Promise.resolve();
    });

    expect(screen.getByText("loading")).toBeInTheDocument();

    await act(async () => {
      profileRequest.resolve({
        data: createProfile({ role: "league_admin" }),
        error: null,
      });
      await profileRequest.promise;
    });

    await waitFor(() => expect(screen.getByText("league_admin")).toBeInTheDocument());
  });
});
