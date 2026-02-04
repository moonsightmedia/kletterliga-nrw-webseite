import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (loading && !timedOut) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Lade...</div>;
  }
  if (!user) {
    return <Navigate to="/app/login" replace />;
  }
  return <>{children}</>;
};

export const RoleGuard = ({
  allow,
  children,
}: {
  allow: Array<"participant" | "gym_admin" | "league_admin">;
  children: React.ReactNode;
}) => {
  const { role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Lade...</div>;
  }

  const hasAccess = allow.includes(role as "participant" | "gym_admin" | "league_admin");
  if (!hasAccess) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
