import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RegisterSuccess from "@/app/pages/auth/RegisterSuccess";

const { hasParticipantLaunchStartedMock } = vi.hoisted(() => ({
  hasParticipantLaunchStartedMock: vi.fn(),
}));

vi.mock("@/config/launch", async () => {
  const actual = await vi.importActual<typeof import("@/config/launch")>("@/config/launch");
  return {
    ...actual,
    formatUnlockDate: () => "01.05.2026",
    hasParticipantLaunchStarted: () => hasParticipantLaunchStartedMock(),
  };
});

describe("RegisterSuccess", () => {
  beforeEach(() => {
    hasParticipantLaunchStartedMock.mockReturnValue(false);
  });

  it("shows a clear success flow with next steps and actions", () => {
    render(
      <MemoryRouter
        initialEntries={["/app/register/success"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/register/success" element={<RegisterSuccess />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Bestätige jetzt deine E-Mail.")).toBeInTheDocument();
    expect(screen.getByText("Postfach öffnen")).toBeInTheDocument();
    expect(screen.getByText("Direkt ins Profil")).toBeInTheDocument();
    expect(screen.getByText(/Saisonbereiche ab 01.05.2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Wenn auch das nicht klappt,/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "info@kletterliga-nrw.de" })).toHaveAttribute(
      "href",
      "mailto:info@kletterliga-nrw.de",
    );
    expect(screen.getByRole("link", { name: /Zum Login/i })).toHaveAttribute(
      "href",
      "/app/login?registered=true",
    );
    expect(screen.getByRole("link", { name: "Zur Startseite" })).toHaveAttribute("href", "/");
  });

  it("switches the season label after launch", () => {
    hasParticipantLaunchStartedMock.mockReturnValue(true);

    render(
      <MemoryRouter
        initialEntries={["/app/register/success"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/register/success" element={<RegisterSuccess />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Saisonbereiche jetzt offen")).toBeInTheDocument();
  });
});
