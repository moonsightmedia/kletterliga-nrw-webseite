import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CTASection } from "@/components/home/CTASection";
import { HeroSection } from "@/components/home/HeroSection";
import { Header } from "@/components/layout/Header";

vi.mock("@/services/appApi", () => ({
  listGyms: vi.fn(() => new Promise(() => {})),
}));

vi.mock("@/services/seasonSettings", () => ({
  useSeasonSettings: () => ({
    getSeasonYear: () => "2026",
  }),
}));

describe("public registration CTAs", () => {
  it("links the homepage hero directly to registration", () => {
    render(<HeroSection />);

    expect(screen.getByRole("link", { name: /Jetzt teilnehmen/i })).toHaveAttribute(
      "href",
      "/app/register",
    );
  });

  it("links the closing homepage CTA directly to registration", () => {
    render(<CTASection />);

    expect(screen.getByRole("link", { name: /Jetzt registrieren/i })).toHaveAttribute(
      "href",
      "/app/register",
    );
  });

  it("links both header participation CTAs directly to registration", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Teilnehmen" })).toHaveAttribute(
      "href",
      "/app/register",
    );

    fireEvent.click(screen.getByRole("button", { name: "Menü öffnen" }));

    expect(screen.getByRole("link", { name: "Jetzt teilnehmen" })).toHaveAttribute(
      "href",
      "/app/register",
    );
  });
});
