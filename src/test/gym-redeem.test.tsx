import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GymRedeem from "@/app/pages/participant/GymRedeem";
import { useAuth } from "@/app/auth/AuthProvider";
import { getGym, redeemGymCode } from "@/services/appApi";

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/components/CodeQrScanner", () => ({
  CodeQrScanner: () => <div>Scanner-Vorschau</div>,
}));

vi.mock("@/services/appApi", () => ({
  getGym: vi.fn(),
  redeemGymCode: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedGetGym = vi.mocked(getGym);
const mockedRedeemGymCode = vi.mocked(redeemGymCode);

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={["/app/gyms/redeem"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/gyms/redeem" element={<GymRedeem />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("GymRedeem", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      profile: {
        id: "profile-1",
        participation_activated_at: "2026-03-27T09:00:00+01:00",
      },
    } as ReturnType<typeof useAuth>);
    mockedGetGym.mockResolvedValue({ data: null, error: null } as Awaited<ReturnType<typeof getGym>>);
    mockedRedeemGymCode.mockResolvedValue({ data: null, error: null } as Awaited<ReturnType<typeof redeemGymCode>>);
  });

  it("renders the hall-code form and fallback link when no gym is preselected", () => {
    renderPage();

    expect(screen.getByText("Halle freischalten")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("KL-XXXXXX-XXXX")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hallen ansehen" })).toHaveAttribute("href", "/app/gyms");
  });
});
