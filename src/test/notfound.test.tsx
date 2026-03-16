import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "@/pages/NotFound";

describe("NotFound", () => {
  it("renders german 404 content", () => {
    render(
      <MemoryRouter initialEntries={["/does-not-exist"]}>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText("Fehler 404")).toBeInTheDocument();
    expect(screen.getByText("DIESE SEITE GIBT ES NICHT")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zur Startseite" })).toHaveAttribute(
      "href",
      "/"
    );
  });
});
