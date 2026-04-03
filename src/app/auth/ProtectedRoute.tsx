import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { AppRouteLoadingState } from "@/app/components/AppRouteLoadingState";
import { ParticipationConsentGate } from "@/app/auth/ParticipationConsentGate";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, hasAcceptedRequiredConsents } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <AppRouteLoadingState
        pathname={location.pathname}
        title={"Zugang wird gepr\u00fcft"}
        description={
          "Wir pr\u00fcfen gerade deine Anmeldung und leiten dich dann automatisch weiter."
        }
      />
    );
  }

  if (!user) {
    return <Navigate to="/app/login" replace />;
  }

  if (!hasAcceptedRequiredConsents) {
    return <ParticipationConsentGate />;
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
  const location = useLocation();

  if (loading) {
    return (
      <AppRouteLoadingState
        pathname={location.pathname}
        title={"Berechtigung wird gepr\u00fcft"}
        description={
          "Wir pr\u00fcfen gerade deine Rolle, damit du auf den richtigen Bereich landest."
        }
      />
    );
  }

  const hasAccess = allow.includes(role as "participant" | "gym_admin" | "league_admin");
  if (!hasAccess) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
