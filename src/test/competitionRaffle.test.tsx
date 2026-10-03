import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaffleScreen } from "@/app/pages/competition/CompetitionRaffle";
import type { RaffleDraw, RaffleSource, RaffleState } from "@/services/competitionRaffle";
const draw: RaffleDraw = {id:"draw1",request_id:"request1",profile_id:"p1",winner_name:"Klara Peters",tickets:9,total_tickets:14,pool_count:2,scope:"semifinal",present_only:true,prize:"Sponsorpreis",created_at:"2026-10-03T16:00:00Z"};
const pool: RaffleState = {entries:[{profile_id:"p1",name:"Klara Peters",tickets:9,visits:8,final_registration:true},{profile_id:"p2",name:"Mia Lehmann",tickets:5,visits:4,final_registration:true}],total_tickets:14,pool_count:2,history:[]};
const source = (): RaffleSource => ({get:vi.fn().mockResolvedValue(pool),draw:vi.fn().mockImplementation(async (_,r)=>({...draw,request_id:r.request_id}))});
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
describe("TV raffle", () => {
  beforeEach(() => { sessionStorage.clear(); vi.useFakeTimers(); Object.defineProperty(window,"matchMedia",{configurable:true,value:vi.fn(()=>({matches:false}))}); });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
  it("defaults to checked-in semifinalists and shows actual ticket counts",async()=>{
    const s=source(); render(<RaffleScreen season="2026" source={s}/>); await flush();
    expect(s.get).toHaveBeenCalledWith("2026","semifinal",true);
    expect(screen.getByLabelText("Nur eingecheckte")).toBeChecked();
    expect(screen.getByText("14")).toBeInTheDocument();
  });
  it("draws once on space, ignores autorepeat and locks while animation runs",async()=>{
    const s=source(); render(<RaffleScreen season="2026" source={s}/>); await flush();
    fireEvent.change(screen.getByLabelText("Preis für die nächste Ziehung"),{target:{value:"Sponsorpreis"}});
    fireEvent.keyDown(window,{code:"Space"}); fireEvent.keyDown(window,{code:"Space",repeat:true}); fireEvent.keyDown(window,{code:"Space"}); await flush();
    expect(s.draw).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button",{name:"Wird ausgelost …"})).toBeDisabled();
    await act(async()=>vi.advanceTimersByTime(4000));
    expect(screen.getByText("Herzlichen Glückwunsch")).toBeInTheDocument();
    expect(screen.getByText("Klara Peters")).toBeInTheDocument();
  });
  it("space in the prize input never triggers a draw",async()=>{
    const s=source(); render(<RaffleScreen season="2026" source={s}/>); await flush();
    fireEvent.keyDown(screen.getByLabelText("Preis für die nächste Ziehung"),{code:"Space"}); await flush(); expect(s.draw).not.toHaveBeenCalled();
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
});
