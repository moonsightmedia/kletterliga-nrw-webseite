import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "@/pages/Index";
import Sponsoren from "@/pages/Sponsoren";
import { SponsorBanner } from "@/components/home/SponsorBanner";

vi.mock("@/components/home/HeroSection", () => ({
  HeroSection: () => <section>Hero</section>,
}));

vi.mock("@/components/home/AboutSection", () => ({
  AboutSection: () => <section>About</section>,
}));

vi.mock("@/components/home/HowItWorksSection", () => ({
  HowItWorksSection: () => <section>How It Works</section>,
}));

vi.mock("@/components/home/SeasonSection", () => ({
  SeasonSection: () => <section>Season</section>,
}));

vi.mock("@/components/home/GymsSection", () => ({
  GymsSection: () => <section>Gyms</section>,
}));

vi.mock("@/components/home/InstagramSection", () => ({
  InstagramSection: () => <section>Instagram</section>,
}));

vi.mock("@/components/home/CTASection", () => ({
  CTASection: () => <section>CTA</section>,
}));

describe("sponsor presentation", () => {
  it("renders the sponsor spotlight on the homepage before the footer", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    const main = screen.getByRole("main");
    const claim = within(main).getByText("Größte Auswahl an Kletterschuhen in NRW");
    const address = within(main).getByText("Süllenstr. 28, 40599 Düsseldorf");
    const footer = screen.getByRole("contentinfo");

    expect(within(main).getByText("HAUPTSPONSOR")).toBeInTheDocument();
    expect(claim).toBeInTheDocument();
    expect(address).toBeInTheDocument();
    expect(claim.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses the official sponsor naming in the global banner", () => {
    render(<SponsorBanner />);

    const link = screen.getByRole("link");

    expect(link).toHaveAttribute("href", "https://kletterladen.nrw");
    expect(screen.getAllByText("kletterladen.nrw").length).toBeGreaterThan(0);
    expect(screen.queryByText("Kletterladen NRW")).not.toBeInTheDocument();
    expect(screen.queryByText(/Süllenstraße 28/)).not.toBeInTheDocument();
  });

  it("shows the official sponsor data on the sponsors page", () => {
    render(
      <MemoryRouter>
        <Sponsoren />
      </MemoryRouter>,
    );

    const main = screen.getByRole("main");
    const links = within(main).getAllByRole("link");

    expect(within(main).getAllByText("kletterladen.nrw").length).toBeGreaterThan(0);
    expect(within(main).getByText("Größte Auswahl an Kletterschuhen in NRW")).toBeInTheDocument();
    expect(within(main).getByText("Süllenstr. 28, 40599 Düsseldorf")).toBeInTheDocument();
    expect(
      links.some(
        (link) => link.getAttribute("href") === "https://www.instagram.com/kletterladen.nrw/",
      ),
    ).toBe(true);
    expect(
      links.some(
        (link) => link.getAttribute("href") === "https://www.facebook.com/kletterladen.nrw/",
      ),
    ).toBe(true);
    expect(screen.queryByText("Kletterladen NRW")).not.toBeInTheDocument();
    expect(screen.queryByText(/Süllenstraße 28/)).not.toBeInTheDocument();
  });

  it("renders the new partner sponsors with their official links", () => {
    render(
      <MemoryRouter>
        <Sponsoren />
      </MemoryRouter>,
    );

    const main = screen.getByRole("main");
    const links = within(main).getAllByRole("link");

    expect(within(main).getByText("Proviant")).toBeInTheDocument();
    expect(within(main).getByText("Hillseye Boards")).toBeInTheDocument();
    expect(links.some((link) => link.getAttribute("href") === "https://www.proviant.de/")).toBe(
      true,
    );
    expect(
      links.some((link) => link.getAttribute("href") === "https://www.hillseye-boards.com/"),
    ).toBe(true);
    expect(
      links.some(
        (link) => link.getAttribute("href") === "https://www.instagram.com/hillseyeboards/",
      ),
    ).toBe(true);
    expect(
      links.some(
        (link) => link.getAttribute("href") === "https://www.facebook.com/hillseye.boards/",
      ),
    ).toBe(true);
    expect(
      links.some(
        (link) => link.getAttribute("href") === "https://www.instagram.com/proviantberlin/",
      ),
    ).toBe(true);
    expect(
      links.some(
        (link) =>
          link.getAttribute("href") === "https://www.facebook.com/ProviantFruchtmanufaktur/",
      ),
    ).toBe(true);
  });
});
