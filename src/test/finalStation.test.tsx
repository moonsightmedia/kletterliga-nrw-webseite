import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinalStationContent } from "@/app/pages/competition/FinalStation";

describe("final phone password login", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(cleanup);
  it("uses an ordinary password field and accepts a password that is not a generated 24-character code", async () => {
    const getFinalStation = vi.fn().mockResolvedValue({ classes: [] });
    render(
      <MemoryRouter>
        <FinalStationContent
          season="2026"
          source={{ getFinalStation, submitFinalAttempt: vi.fn() }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Finalpasswort")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("button", { name: "Anmelden" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Finalpasswort"), {
      target: { value: "Synthetic-Password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));
    expect(
      await screen.findByRole("combobox", { name: "Finalklasse" }),
    ).toBeInTheDocument();
    expect(getFinalStation).toHaveBeenCalledWith(
      "2026",
      1,
      "Synthetic-Password",
    );
    expect(
      screen.getByRole("button", { name: "Abmelden" }),
    ).toBeInTheDocument();
  });
});
