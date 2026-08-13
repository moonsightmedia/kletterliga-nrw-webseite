import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import GymRankings from "@/app/pages/admin/GymRankings";
import { getGymAdminRankings } from "@/services/appApi";

vi.mock("@/services/appApi", () => ({
  getGymAdminRankings: vi.fn(),
}));

const mockedGetGymAdminRankings = vi.mocked(getGymAdminRankings);

const renderRankings = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GymRankings />
    </QueryClientProvider>,
  );
};

describe("GymRankings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetGymAdminRankings.mockResolvedValue({
      data: [
        { rank: 1, display_name: "Max Muster", points: 11 },
        { rank: 2, display_name: "Tanja Test", points: 7 },
      ],
      error: null,
    });
  });

  it("shows the minimized complete ranking and switches filters", async () => {
    renderRankings();

    expect(await screen.findByText("Max Muster")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rangliste" })).toBeInTheDocument();
    expect(screen.getByText("2 Platzierungen")).toBeInTheDocument();
    expect(mockedGetGymAdminRankings).toHaveBeenCalledWith("toprope", "UE15", "m");

    fireEvent.change(screen.getByLabelText("Liga"), { target: { value: "lead" } });
    fireEvent.change(screen.getByLabelText("Wertungsklasse"), { target: { value: "U15" } });
    fireEvent.change(screen.getByLabelText("Geschlecht"), { target: { value: "w" } });

    await waitFor(() =>
      expect(mockedGetGymAdminRankings).toHaveBeenCalledWith("lead", "U15", "w"),
    );
    expect(screen.getByText(/Vorstieg · U15 weiblich/)).toBeInTheDocument();
  });

  it("renders a stable empty state", async () => {
    mockedGetGymAdminRankings.mockResolvedValue({ data: [], error: null });
    renderRankings();

    expect(
      await screen.findByText("Für diese Filterkombination gibt es aktuell noch keine Ranglisteneinträge."),
    ).toBeInTheDocument();
  });

  it("shows API errors and supports a manual retry", async () => {
    mockedGetGymAdminRankings
      .mockResolvedValueOnce({ data: null, error: { message: "Rangliste ist gerade nicht erreichbar" } })
      .mockResolvedValueOnce({ data: null, error: { message: "Rangliste ist gerade nicht erreichbar" } })
      .mockResolvedValueOnce({
        data: [{ rank: 1, display_name: "Nach Retry", points: 50 }],
        error: null,
      });

    renderRankings();

    expect(
      await screen.findByText("Rangliste ist gerade nicht erreichbar", {}, { timeout: 4_000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    expect(await screen.findByText("Nach Retry")).toBeInTheDocument();
  });
});
