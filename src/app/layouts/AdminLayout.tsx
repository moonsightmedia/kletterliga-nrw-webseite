import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { useMarkAppStartupSplashSeen } from "@/app/startup/appStartupSplash";
import { AdminNavigation } from "@/app/components/AdminNavigation";
import { adminNavigationLocation } from "@/lib/adminNavigation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
export const AdminShell = ({ role, signOut, children, previewPath }: { role: string | null; signOut?: () => unknown; children: ReactNode; previewPath?: string }) => {
  const { pathname, search } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const current = adminNavigationLocation(role, previewPath ?? pathname);
  useEffect(() => { setMobileMenuOpen(false); }, [pathname, search]);
  const navigation = <div className="flex h-full min-h-0 flex-col bg-[#faf9f6] text-[#003d55]">
    <div className="border-b border-[#003d55]/10 px-6 py-6"><Link to="/app/admin" className="block text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]">Kletterliga NRW</Link><p className="mt-1 text-xs text-[#526570]">{role === "gym_admin" ? "Hallenverwaltung" : "Administration"}</p></div>
    <div className="min-h-0 flex-1 overflow-y-auto"><AdminNavigation activePath={previewPath} role={role} onNavigate={() => setMobileMenuOpen(false)} /></div>
    <div className="space-y-1 border-t border-[#003d55]/10 p-3"><Link to="/app" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-[#526570] hover:bg-[#ede8dd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]"><ArrowLeft size={17} />Zur App</Link>{signOut && <button type="button" onClick={() => { void signOut(); setMobileMenuOpen(false); }} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-[#526570] hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]"><LogOut size={17} />Abmelden</button>}</div>
  </div>;
  return <div className="stitch-app stitch-app-shell min-h-screen bg-[#f4f3ee] text-[#003d55] md:flex">
    <aside aria-label="Administration" className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-[#003d55]/10 md:block">{navigation}</aside>
    <div className="min-w-0 flex-1"><header className="flex min-h-16 items-center gap-3 border-b border-[#003d55]/10 bg-white px-4 md:px-6">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}><SheetTrigger asChild><button type="button" aria-label="Adminmenü öffnen" className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[#f2ede4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523] md:hidden"><Menu size={21} /></button></SheetTrigger><SheetContent side="left" className="w-[85vw] max-w-80 border-[#003d55]/10 p-0 [&>button]:text-[#003d55]"><SheetHeader className="sr-only"><SheetTitle>Adminnavigation</SheetTitle><SheetDescription>Bereich auswählen</SheetDescription></SheetHeader>{navigation}</SheetContent></Sheet>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-[#526570]"><span>Admin</span>{current.group && <><span aria-hidden="true">/</span><span className="font-medium text-[#003d55]">{current.group.label}</span></>}{current.item && current.item.label !== current.group?.label && <><span aria-hidden="true">/</span><span className="truncate">{current.item.label}</span></>}</div>
    </header><main id="admin-content" className="min-w-0 p-4 md:p-6 lg:p-8">{children}</main></div>
  </div>;
};

export const AdminLayout = () => {
  useMarkAppStartupSplashSeen();
  const {role, signOut}=useAuth();
  return <AdminShell role={role} signOut={signOut}><Outlet /></AdminShell>;
};
