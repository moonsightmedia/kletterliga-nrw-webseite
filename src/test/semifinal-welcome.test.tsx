import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SemifinalWelcome from "@/app/components/SemifinalWelcome";

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

it("keeps help collapsed on first visit and leaves instructions available after dismissing the tip", () => {
  const view = render(<SemifinalWelcome profileId="help-test-1" season="2026" deadline="2026-10-03T15:30:00+02:00" />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(view.container.querySelector("details")).not.toHaveAttribute("open");
  fireEvent.click(screen.getByRole("button", { name: "Tipp ausblenden" }));
  expect(screen.queryByText("Griff wählen → QR scannen → Ergebnis absenden.")).not.toBeInTheDocument();
  expect(localStorage.getItem("competition-day:tip:help-test-1:2026:v1")).toBe("dismissed");
  fireEvent.click(screen.getByText("Hilfe zum Halbfinale"));
  expect(view.container.querySelector("details")).toHaveAttribute("open");
  expect(screen.getByText(/Sicherungspartner/)).toBeVisible();
  expect(screen.getByText(/Der Scan allein speichert nichts/)).toBeVisible();
  expect(screen.getByText(/15:30 Uhr/)).toBeVisible();
  view.unmount();
  const next = render(<SemifinalWelcome profileId="help-test-1" season="2026" />);
  expect(screen.queryByRole("button", { name: "Tipp ausblenden" })).not.toBeInTheDocument();
  next.rerender(<SemifinalWelcome profileId="help-test-1" season="2027" />);
  expect(screen.getByRole("button", { name: "Tipp ausblenden" })).toBeInTheDocument();
});

it("keeps dismissal per participant even when browser storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  const view = render(<SemifinalWelcome profileId="help-test-2" season="2026" />);
  fireEvent.click(screen.getByRole("button", { name: "Tipp ausblenden" }));
  view.unmount();
  const next = render(<SemifinalWelcome profileId="help-test-2" season="2026" />);
  expect(screen.queryByRole("button", { name: "Tipp ausblenden" })).not.toBeInTheDocument();
  next.rerender(<SemifinalWelcome profileId="help-test-3" season="2026" />);
  expect(screen.getByRole("button", { name: "Tipp ausblenden" })).toBeInTheDocument();
});
