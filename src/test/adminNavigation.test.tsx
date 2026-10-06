import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AdminNavigation } from "@/app/components/AdminNavigation";
import { adminNavigationGroups } from "@/lib/adminNavigation";

afterEach(cleanup);
describe("grouped admin navigation", () => {
  it("opens the current competition group without exposing every season tool", () => {
    render(<MemoryRouter initialEntries={["/app/admin/league/wettkampf?bereich=setup"]}><AdminNavigation role="league_admin" /></MemoryRouter>);
    expect(screen.getByRole("button",{name:"Wettkampftag"})).toHaveAttribute("aria-expanded","true");
    expect(screen.getByRole("link",{name:"Halbfinale & Finale"})).toHaveAttribute("aria-current","page");
    expect(screen.queryByRole("link",{name:"Qualifikationsrouten"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Saison & Wertung"}));
    expect(screen.getByRole("link",{name:"Qualifikationsrouten"})).toHaveAttribute("href","/app/admin/league/routes");
    expect(screen.getByRole("button",{name:"Wettkampftag"})).toHaveAttribute("aria-expanded","false");
  });
  it("keeps gym and league tools separated by role", () => {
    render(<MemoryRouter initialEntries={["/app/admin/gym/routes"]}><AdminNavigation role="gym_admin" /></MemoryRouter>);
    expect(screen.queryByRole("button",{name:"Wettkampftag"})).not.toBeInTheDocument();
    expect(screen.getByRole("link",{name:"Routen"})).toHaveAttribute("aria-current","page");
    expect(within(screen.getByRole("navigation")).getAllByRole("button")).toHaveLength(3);
  });
  it("retains every existing league destination once", () => {
    const paths=adminNavigationGroups.league_admin.flatMap(group=>group.items.map(item=>item.to));
    expect(paths).toHaveLength(17); expect(new Set(paths).size).toBe(17);
    expect(paths).toContain("/app/admin/league/season-feedback");
    expect(paths).toContain("/verlosung/2026");
    for(const path of ["wettkampf","finale","participants","change-requests","season","classes","stage-winners","routes","results","route-feedback","gyms","codes","mastercodes","settings"]) expect(paths).toContain(`/app/admin/league/${path}`);
  });
});
