import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaffleScreen } from "@/app/pages/competition/CompetitionRaffle";
import type { RaffleDraw, RaffleSource, RaffleState } from "@/services/competitionRaffle";
const draw: RaffleDraw = {id:"draw1",request_id:"request1",profile_id:"p1",winner_name:"Klara Peters",tickets:9,total_tickets:14,pool_count:2,scope:"semifinal",present_only:true,prize:"Sponsorpreis",created_at:"2026-10-03T16:00:00Z"};
const pool: RaffleState = {entries:[{profile_id:"p1",name:"Klara Peters",tickets:9,visits:8,final_registration:true},{profile_id:"p2",name:"Mia Lehmann",tickets:5,visits:4,final_registration:true}],total_tickets:14,pool_count:2,history:[]};
const source = (): RaffleSource => {
  const get=vi.fn().mockResolvedValue(pool);
  return {get,draw:vi.fn().mockImplementation(async (_,r)=>{const saved={...draw,request_id:r.request_id};get.mockResolvedValue({...pool,history:[saved]});return saved;})};
};
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
describe("TV raffle", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); vi.useFakeTimers(); Object.defineProperty(window,"matchMedia",{configurable:true,value:vi.fn(()=>({matches:false}))}); });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
  it("defaults to checked-in semifinalists and shows actual ticket counts",async()=>{
    const s=source(); render(<RaffleScreen season="2026" source={s}/>); await flush();
    expect(s.get).toHaveBeenCalledWith("2026","semifinal",true,true);
    expect(screen.getByRole("combobox",{name:"Teilnehmerkreis"})).toHaveTextContent("Anwesende");
    expect(screen.queryByLabelText("Nur eingecheckte")).not.toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
  });
  it("draws once on space, ignores autorepeat and locks while animation runs",async()=>{
    const s=source(); render(<RaffleScreen season="2026" source={s}/>); await flush();
    fireEvent.change(screen.getByLabelText("Preis für die nächste Ziehung"),{target:{value:"Sponsorpreis"}});
    fireEvent.keyDown(window,{code:"Space"}); fireEvent.keyDown(window,{code:"Space",repeat:true}); fireEvent.keyDown(window,{code:"Space"}); await flush();
    expect(s.draw).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button",{name:"Wird ausgelost …"})).toBeDisabled();
    expect(screen.getByLabelText("Mehrfachgewinne erlauben")).toBeDisabled();
    await act(async()=>vi.advanceTimersByTime(4000));
    expect(screen.getByText("Herzlichen Glückwunsch")).toBeInTheDocument();
    expect(screen.getAllByText("Klara Peters")).toHaveLength(2);
  });
  it("space in the prize input never triggers a draw",async()=>{
    const s=source(); render(<RaffleScreen season="2026" source={s}/>); await flush();
    fireEvent.keyDown(screen.getByLabelText("Preis für die nächste Ziehung"),{code:"Space"}); await flush(); expect(s.draw).not.toHaveBeenCalled();
  });
  it("refreshes the pool and snapshots the selected winner policy for a draw",async()=>{
    const s=source(); render(<RaffleScreen season="2026" source={s}/>); await flush();
    fireEvent.click(screen.getByLabelText("Mehrfachgewinne erlauben")); await flush();
    expect(s.get).toHaveBeenLastCalledWith("2026","semifinal",true,false);
    expect(screen.getByText(/bisherige Gewinner ausgeschlossen/)).toBeInTheDocument();
    expect(localStorage.getItem("kletterliga-raffle-repeat-v1-2026")).toBe("false");
    fireEvent.click(screen.getByRole("button",{name:"Jetzt auslosen"})); await flush();
    expect(vi.mocked(s.draw).mock.calls[0][1].repeat_allowed).toBe(false);
  });
  it("restores a pending request policy instead of using a changed saved preference",async()=>{
    localStorage.setItem("kletterliga-raffle-repeat-v1-2026","true");
    sessionStorage.setItem("kletterliga-raffle-pending-2026",JSON.stringify({scope:"semifinal",present_only:true,repeat_allowed:false,request_id:"pending1",prize:"Board"}));
    const s=source(); render(<RaffleScreen season="2026" source={s}/>); await flush();
    expect(screen.getByLabelText("Mehrfachgewinne erlauben")).not.toBeChecked();
    expect(screen.getByLabelText("Mehrfachgewinne erlauben")).toBeDisabled();
    fireEvent.click(screen.getByRole("button",{name:"Ziehung prüfen / fortsetzen"})); await flush();
    expect(vi.mocked(s.draw).mock.calls[0][1]).toMatchObject({request_id:"pending1",repeat_allowed:false});
  });
  it("retries the same request ID after a lost response instead of redrawing",async()=>{
    const s=source(); vi.mocked(s.draw).mockRejectedValueOnce(new Error("offline"));
    render(<RaffleScreen season="2026" source={s}/>); await flush();
    fireEvent.click(screen.getByRole("button",{name:"Jetzt auslosen"})); await flush();
    expect(screen.getByRole("alert")).toHaveTextContent("kein zweiter Gewinner");
    fireEvent.click(screen.getByRole("button",{name:"Ziehung prüfen / fortsetzen"})); await flush();
    expect(vi.mocked(s.draw).mock.calls[0][1].request_id).toEqual(vi.mocked(s.draw).mock.calls[1][1].request_id);
  });
  it("recovers an already persisted pending winner without another draw",async()=>{
    sessionStorage.setItem("kletterliga-raffle-pending-2026",JSON.stringify({scope:"semifinal",present_only:true,request_id:"request1",prize:"Sponsorpreis"}));
    const s=source(); vi.mocked(s.get).mockResolvedValue({...pool,history:[draw]});
    render(<RaffleScreen season="2026" source={s}/>); await flush();
    expect(screen.getByText("Herzlichen Glückwunsch")).toBeInTheDocument(); expect(s.draw).not.toHaveBeenCalled(); expect(sessionStorage.getItem("kletterliga-raffle-pending-2026")).toBeNull();
  });
  it("does not allow stale pools to be drawn after a refresh error",async()=>{
    const s=source(); vi.mocked(s.get).mockRejectedValue(new Error("offline"));
    render(<RaffleScreen season="2026" source={s}/>); await flush();
    expect(screen.getByRole("button",{name:"Jetzt auslosen"})).toBeDisabled();
  });
  it("respects reduced motion and reveals without the slot animation",async()=>{
    Object.defineProperty(window,"matchMedia",{configurable:true,value:vi.fn(()=>({matches:true}))});
    const s=source(); render(<RaffleScreen season="2026" source={s}/>); await flush();
    fireEvent.click(screen.getByRole("button",{name:"Jetzt auslosen"})); await flush();
    await act(async()=>vi.advanceTimersByTime(1)); expect(screen.getByText("Herzlichen Glückwunsch")).toBeInTheDocument();
  });
  it("shows the consumed ticket and permanently saved prize after a draw",async()=>{
    const s=source(); vi.mocked(s.draw).mockResolvedValue({...draw,remaining_tickets:8});
    vi.mocked(s.get).mockResolvedValueOnce(pool).mockResolvedValue({...pool,history:[{...draw,remaining_tickets:8}]});
    render(<RaffleScreen season="2026" source={s}/>); await flush();
    fireEvent.click(screen.getByRole("button",{name:"Jetzt auslosen"})); await flush();
    await act(async()=>vi.advanceTimersByTime(4000));
    expect(screen.getByText(/9 Lose vor der Ziehung · 8 übrig/)).toBeInTheDocument();
    expect(screen.getByText("Sponsorpreis")).toBeInTheDocument();
  });
  it("requires confirmation for an individual cancellation, then clears the winner and restores the pool",async()=>{
    const s=source(); vi.mocked(s.get).mockResolvedValue({...pool,total_tickets:13,history:[draw]});
    s.cancel=vi.fn().mockImplementation(async()=>{vi.mocked(s.get).mockResolvedValue(pool);return {cancelled_count:1}});
    render(<RaffleScreen season="2026" source={s}/>);await flush();
    fireEvent.click(screen.getByRole("button",{name:"Gewinn von Klara Peters rückgängig machen"}));await flush();
    expect(s.cancel).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Pro Gewinn kommt ein Los zurück");
    fireEvent.keyDown(window,{code:"Space"});await flush();expect(s.draw).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Abbrechen"}));await flush();expect(s.cancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Gewinn von Klara Peters rückgängig machen"}));await flush();
    fireEvent.click(screen.getByRole("button",{name:"Ja, Gewinn rückgängig machen"}));await flush();
    expect(s.cancel).toHaveBeenCalledWith("2026",expect.objectContaining({draw_ids:["draw1"],reset_all:false}));
    expect(screen.getByRole("status")).toHaveTextContent("1 Gewinn wurde");
    expect(screen.queryByText("Herzlichen Glückwunsch")).not.toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
  });
  it("resets the exact eventwide history shown and retries the same cancellation request after a missing response",async()=>{
    const s=source();vi.mocked(s.get).mockResolvedValue({...pool,history:[draw,{...draw,id:"draw2",scope:"all"}]});
    s.cancel=vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({cancelled_count:2});
    render(<RaffleScreen season="2026" source={s}/>);await flush();
    fireEvent.click(screen.getByRole("button",{name:"Alle Gewinne zurücksetzen"}));await flush();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("(2 Gewinne)");
    fireEvent.click(screen.getByRole("button",{name:"Ja, alle zurücksetzen"}));await flush();
    expect(screen.getByRole("alert")).toHaveTextContent("kein Los doppelt zurückgegeben");
    fireEvent.click(screen.getByRole("button",{name:"Ja, alle zurücksetzen"}));await flush();
    const calls=vi.mocked(s.cancel).mock.calls;
    expect(calls[0][1]).toMatchObject({draw_ids:["draw1","draw2"],reset_all:true});
    expect(calls[0][1].request_id).toBe(calls[1][1].request_id);
  });
  it("refuses a reset if the live history changed and requires a fresh confirmation",async()=>{
    const s=source();vi.mocked(s.get).mockResolvedValue({...pool,history:[draw]});
    s.cancel=vi.fn().mockRejectedValue(new Error("RAFFLE_HISTORY_CHANGED"));
    render(<RaffleScreen season="2026" source={s}/>);await flush();
    fireEvent.click(screen.getByRole("button",{name:"Alle Gewinne zurücksetzen"}));await flush();
    fireEvent.click(screen.getByRole("button",{name:"Ja, alle zurücksetzen"}));await flush();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("inzwischen geändert");
  });
});
