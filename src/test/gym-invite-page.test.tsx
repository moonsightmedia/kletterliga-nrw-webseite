import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import GymInvite from "@/app/pages/auth/GymInvite";
import { fetchGymInvite } from "@/services/appApi";

const pageMocks = vi.hoisted(() => ({
  toast: vi.fn(),
  fetchGymInvite: vi.fn(),
}));

const mockedFetchGymInvite = vi.mocked(fetchGymInvite);

vi.mock("@/services/appApi", () => ({
  fetchGymInvite: pageMocks.fetchGymInvite,
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: pageMocks.toast,
}));

const LoginStub = () => {
  const location = useLocation();
  return <div>Login Stub {location.state?.email ?? ""}</div>;
};

describe("GymInvite page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchGymInvite.mockResolvedValue({
      data: {
        email: "halle@example.com",
        gym_id: "gym-1",
        gym_name: "Kletterhalle Test",
        expires_at: "2026-12-10T12:00:00.000Z",
        used_at: null,
        revoked_at: null,
      },
      error: null,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderPage = () =>
    render(
      <MemoryRouter
        initialEntries={["/app/invite/gym/token-123"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/invite/gym/:token" element={<GymInvite />} />
          <Route path="/app/login" element={<LoginStub />} />
        </Routes>
      </MemoryRouter>,
    );

  it("loads the hall claim and submits only password data", async () => {
    renderPage();

    expect(await screen.findByText("Hallenzugang einrichten")).toBeInTheDocument();
    expect(screen.getByText("Kletterhalle Test")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Passwort *"), {
      target: { value: "secret12" },
    });
    fireEvent.change(screen.getByLabelText("Passwort wiederholen *"), {
      target: { value: "secret12" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Zugang einrichten" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/complete-gym-invite"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            token: "token-123",
            password: "secret12",
          }),
        }),
      );
    });

    expect(await screen.findByText("Login Stub halle@example.com")).toBeInTheDocument();
  });
});
