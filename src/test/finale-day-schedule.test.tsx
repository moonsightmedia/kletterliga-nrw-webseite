import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FinaleDaySchedule } from "@/components/home/FinaleDaySchedule";

describe("Finaltag-Ablauf auf der Startseite", () => {
  it("zeigt die öffentlichen Zeiten und trennt Zuschauer- vom Starter-Check-in", () => {
    render(
      <MemoryRouter>
        <FinaleDaySchedule onHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "FINALTAG: DER ABLAUF" })).toBeInTheDocument();
    expect(screen.getByText(/ohne Startanmeldung kannst du zum Zuschauen vorbeikommen/)).toBeInTheDocument();
    expect(screen.getByText(/Für angemeldete Starter:innen; der Check-in endet um 12:00 Uhr/)).toBeInTheDocument();
    expect(screen.getByText("16:00").closest("time")).toHaveAttribute("dateTime", "2026-10-03T16:00:00+02:00");
    expect(screen.getByRole("heading", { name: "Halbfinale endet" })).toBeInTheDocument();
    expect(screen.getByText("Bis 16:00 Uhr müssen alle Halbfinal-Ergebnisse in der App eingetragen sein.")).toBeInTheDocument();
    expect(document.querySelectorAll("#finaltag-ablauf time")).toHaveLength(9);
    expect(screen.getByRole("link", { name: /Mehr zum Finaltag/ })).toHaveAttribute("href", "/finale");
    expect(screen.getByText(/Die Ergebnisfrist für das Halbfinale ist 16:00 Uhr/)).toBeInTheDocument();
  });
});
