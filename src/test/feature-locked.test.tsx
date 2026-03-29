import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FeatureLocked from "@/app/pages/participant/FeatureLocked";

vi.mock("@/config/launch", async () => {
  const actual = await vi.importActual<typeof import("@/config/launch")>("@/config/launch");
  return {
    ...actual,
    getUnlockDate: () => new Date("2026-05-01T00:00:00+02:00"),
  };
});

describe("FeatureLocked", () => {
  it("shows the unlock date and a way back to the dashboard", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <FeatureLocked title="Hallenbereich folgt zum Saisonstart" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Hallenbereich folgt zum Saisonstart")).toBeInTheDocument();
    expect(screen.getByText("Freischaltung am 01.05.2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Zum Dashboard/i })).toHaveAttribute("href", "/app");
  });
});
