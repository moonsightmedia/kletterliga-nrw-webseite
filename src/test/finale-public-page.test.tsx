import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Finale from "@/pages/Finale";

describe("public finale page", () => {
  it("publishes the confirmed event facts and keeps open details explicit", async () => {
    render(
      <MemoryRouter initialEntries={["/finale"]}>
        <Finale />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "FINALE DER KLETTERLIGA NRW 2026" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Samstag, 3. Oktober 2026").length).toBeGreaterThan(0);
    expect(screen.getByText("Rosmarter Allee 12")).toBeInTheDocument();
    expect(screen.getByText("58762 Altena")).toBeInTheDocument();
    expect(screen.getByText("Zeitplan wird finalisiert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "FOODTRUCK VOR ORT" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Foodtruck von Marla & Mathilda’s Genusswerkstatt mit geöffneter Ausgabetheke",
      }),
    ).toHaveAttribute("src", "/images/finale/foodtruck-marla-mathildas.webp");
    expect(
      screen.getByRole("heading", { name: "SALE-STAND VOM KLETTERLADEN NRW" }),
    ).toHaveAttribute("id", "finale-sale-stand");
    expect(
      screen.getByRole("img", {
        name: "Wanderschuh-Auswahl im Fachgeschäft kletterladen.nrw",
      }),
    ).toHaveAttribute("src", "/images/finale/kletterladen-wanderschuhe.webp");
    const climbingShoeImage = screen.getByRole("img", {
      name: "Kletterschuh aus dem Sortiment von kletterladen.nrw",
    });
    expect(climbingShoeImage).toHaveAttribute(
      "src",
      "/images/finale/kletterladen-kletterschuh.webp",
    );
    expect(climbingShoeImage).toHaveClass("mix-blend-multiply");
    expect(climbingShoeImage.parentElement).toHaveClass("bg-kl-accent");

    const grigriImage = screen.getByRole("img", {
      name: "GRIGRI aus dem Sortiment von kletterladen.nrw",
    });
    expect(grigriImage).toHaveAttribute("src", "/images/finale/kletterladen-hardware.webp");
    expect(grigriImage).toHaveClass("mix-blend-multiply");
    expect(grigriImage.parentElement).toHaveClass("bg-kl-accent");

    const kletterladenLogo = screen.getByRole("img", { name: "kletterladen.nrw" });
    expect(kletterladenLogo).toHaveAttribute("src", "/sponsors/kletterladen-nrw-www.svg");
    expect(kletterladenLogo.parentElement).toHaveClass("bg-kl-accent");
    expect(screen.queryByText(/Echter Finale-Moment/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Zum Kletterladen/i })).toHaveAttribute(
      "href",
      "https://kletterladen.nrw",
    );
    expect(screen.getByText("Currywurst und Seitan-Döner")).toBeInTheDocument();
    expect(screen.getByText("Classic- und Tschicken-Burger")).toBeInTheDocument();
    expect(screen.getByText("Crêpe und Softeis")).toBeInTheDocument();
    expect(screen.getByText("50 % auf alle Wanderschuhe")).toBeInTheDocument();
    expect(screen.getByText("Bis zu 60 % auf ausgewählte Kletterschuhe")).toBeInTheDocument();
    expect(screen.getByText("GRIGRI für 60 €")).toBeInTheDocument();
    expect(screen.getByText("Kletterhosen und Hardware")).toBeInTheDocument();
    expect(
      screen.queryByText("Besucherpreise und Ausgabezeiten werden noch ergänzt."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Originalaufnahme eines Anbieter-Foodtrucks"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Verkaufszeiten, das genaue GRIGRI-Modell und die Verfügbarkeit werden noch ergänzt.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Speisekarte und Besucherpreise folgen")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Die konkreten Produkte und Sale-Angebote kündigen wir vor dem Finaltag an."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Qualifikation verstehen/i })).toHaveAttribute(
      "href",
      "/modus",
    );

    await waitFor(() => {
      expect(document.title).toContain("Finale 2026 der Kletterliga NRW");
    });

    const structuredData = document.querySelector<HTMLScriptElement>(
      'script[data-kl-schema="page"]',
    );
    expect(structuredData?.textContent).toContain('"@type":"SportsEvent"');
    expect(structuredData?.textContent).toContain('"startDate":"2026-10-03"');
  });
});
