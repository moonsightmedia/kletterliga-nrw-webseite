import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CompetitionRankingsView from "@/app/components/CompetitionRankingsView";
import CompetitionLiveView from "@/app/components/CompetitionLiveView";
import type { CompetitionStanding } from "@/services/competitionDay";
import type { LiveData } from "@/services/competitionFinal";

const regular = (name: string, points: number, rank: number): CompetitionStanding => ({
  profile_id: name, name, points, rank, league: "lead", class_label: "Ü15-w", completed_routes: 5,
});
const aw = (points: number): CompetitionStanding => ({...regular("Mia Lehmann",points,1), rank:null, is_out_of_competition:true});
const mount = (rows: CompetitionStanding[]) => render(<CompetitionRankingsView semifinal={rows} finals={[]} updated={new Date()} />);

describe("out-of-competition semifinal presentation", () => {
  afterEach(cleanup);
  it("shows AW first by points while regular ranks remain 1 to 6", () => {
    const rows = Array.from({length:6},(_,i)=>regular(`Person ${i+1}`,400-i*10,i+1));
    mount([...rows,aw(450)]);
    const entries=screen.getAllByRole("listitem");
    expect(entries[0]).toHaveTextContent("AW");
    expect(entries[0]).toHaveTextContent("Mia Lehmann");
    expect(entries[0]).toHaveTextContent("Außer Wertung · kein Finaleinzug");
    expect(entries[0]).toHaveClass("bg-[#f7f3e9]");
    for(let i=1;i<=6;i++) expect(screen.getByLabelText(`Platz ${i}`)).toBeInTheDocument();
    expect(screen.queryByLabelText("Platz 7")).not.toBeInTheDocument();
  });
  it("keeps AW between regular competitors according to points instead of pushing it to the bottom", () => {
    mount([regular("Erste",450,1),regular("Zweite",300,2),aw(400)]);
    const entries=screen.getAllByRole("listitem");
    expect(entries[0]).toHaveTextContent("Erste");
    expect(entries[1]).toHaveTextContent("AW");
    expect(entries[2]).toHaveTextContent("Zweite");
  });
  it("does not turn a tied AW score into an official first place", () => {
    mount([aw(450),regular("Zoe",450,1)]);
    expect(screen.getAllByLabelText("Platz 1")).toHaveLength(1);
    expect(screen.getByLabelText("Außer Wertung")).toHaveTextContent("AW");
  });
  it("shows AW and muted styling on the public live display too", () => {
    const data:LiveData={season:"2026",phase:"semifinal",pinned_key:null,interval_seconds:15,class_keys:[],semifinal_open:true,updated_at:new Date().toISOString(),notices:[],classes:[{key:"lead|Ü15-w",league:"lead",class_label:"Ü15-w",entries:[{name:"Mia Lehmann",rank:null,points:450,completed:5,is_out_of_competition:true},{name:"Zoe",rank:1,points:400,completed:5}]}]};
    render(<CompetitionLiveView data={data} season="2026" lastSuccess={new Date()} />);
    expect(screen.getByText("AW")).toBeInTheDocument();
    expect(screen.getByText("Mia Lehmann").closest("tr")).toHaveClass("opacity-[0.65]");
    expect(screen.getByText("Außer Wertung")).toBeInTheDocument();
  });
});
