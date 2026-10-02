import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminNavigationGroups, adminNavigationLocation, matchesAdminPath } from "@/lib/adminNavigation";
export function AdminNavigation({ role, onNavigate, activePath }: { role: string | null; onNavigate?: () => void; activePath?: string }) {
  const location = useLocation();
  const pathname = activePath ?? location.pathname;
  const groups = adminNavigationGroups[role ?? ""] ?? [];
  const activeGroup = adminNavigationLocation(role, pathname).group?.id;
  const [expanded, setExpanded] = useState<string | undefined>(activeGroup);
  useEffect(() => { setExpanded(activeGroup); }, [activeGroup, pathname]);
  const linkClass = "flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[#f2ede4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]";
  return <nav aria-label="Adminbereiche" className="space-y-1 p-3">{groups.map((group) => {
    const Icon = group.icon;
    if (group.items.length === 1) return <NavLink key={group.id} to={group.items[0].to} end={group.id === "home"} onClick={onNavigate} className={({ isActive }) => cn(linkClass, "gap-3", (activePath ? matchesAdminPath(pathname, group.items[0].to) : isActive) ? "bg-[#ede8dd] text-[#003d55]" : "text-[#526570]")}><Icon size={18} aria-hidden="true" />{group.label}</NavLink>;
    const open = expanded === group.id;
    return <div key={group.id}>
      <button type="button" aria-expanded={open} aria-controls={`admin-group-${group.id}`} onClick={() => setExpanded(open ? undefined : group.id)} className={cn(linkClass, "w-full gap-3 text-left", activeGroup === group.id ? "bg-[#ede8dd] text-[#003d55]" : "text-[#526570]")}><Icon size={18} aria-hidden="true" /><span className="flex-1">{group.label}</span><ChevronDown size={15} aria-hidden="true" className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")} /></button>
      <div id={`admin-group-${group.id}`} hidden={!open} className="ml-5 mt-1 space-y-1 border-l border-[#003d55]/15 pl-3">{group.items.map((item) => <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => cn(linkClass, (activePath ? matchesAdminPath(pathname, item.to) : isActive) ? "font-semibold text-[#a15523]" : "text-[#526570]")}>{item.label}</NavLink>)}</div>
    </div>;
  })}</nav>;
}
