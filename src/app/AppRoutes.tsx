import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { ParticipantLayout } from "@/app/layouts/ParticipantLayout";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { ProtectedRoute, RoleGuard } from "@/app/auth/ProtectedRoute";
import { isParticipantFeatureLocked } from "@/config/launch";

const Login = lazy(() => import("@/app/pages/auth/Login"));
const Register = lazy(() => import("@/app/pages/auth/Register"));
const RegisterSuccess = lazy(() => import("@/app/pages/auth/RegisterSuccess"));
const GymInvite = lazy(() => import("@/app/pages/auth/GymInvite"));
const EmailConfirm = lazy(() => import("@/app/pages/auth/EmailConfirm"));
const ResetPassword = lazy(() => import("@/app/pages/auth/ResetPassword"));

const Home = lazy(() => import("@/app/pages/participant/Home"));
const Gyms = lazy(() => import("@/app/pages/participant/Gyms"));
const GymDetail = lazy(() => import("@/app/pages/participant/GymDetail"));
const GymRedeem = lazy(() => import("@/app/pages/participant/GymRedeem"));
const GymRoutes = lazy(() => import("@/app/pages/participant/GymRoutes"));
const ResultEntry = lazy(() => import("@/app/pages/participant/ResultEntry"));
const Rankings = lazy(() => import("@/app/pages/participant/Rankings"));
const AgeGroupRankings = lazy(() => import("@/app/pages/participant/AgeGroupRankings"));
const Profile = lazy(() => import("@/app/pages/participant/Profile"));
const MastercodeRedeem = lazy(() => import("@/app/pages/participant/MastercodeRedeem"));
const Finale = lazy(() => import("@/app/pages/participant/Finale"));
const FeatureLocked = lazy(() => import("@/app/pages/participant/FeatureLocked"));

const AdminHome = lazy(() => import("@/app/pages/admin/AdminHome"));
const GymAdminDashboard = lazy(() => import("@/app/pages/admin/GymAdminDashboard"));
const GymProfile = lazy(() => import("@/app/pages/admin/GymProfile"));
const GymRoutesAdmin = lazy(() => import("@/app/pages/admin/GymRoutesAdmin"));
const GymCodes = lazy(() => import("@/app/pages/admin/GymCodes"));
const GymMastercodes = lazy(() => import("@/app/pages/admin/GymMastercodes"));
const GymStats = lazy(() => import("@/app/pages/admin/GymStats"));
const LeagueDashboard = lazy(() => import("@/app/pages/admin/LeagueDashboard"));
const LeagueSeason = lazy(() => import("@/app/pages/admin/LeagueSeason"));
const LeagueGyms = lazy(() => import("@/app/pages/admin/LeagueGyms"));
const LeagueClasses = lazy(() => import("@/app/pages/admin/LeagueClasses"));
const LeagueResults = lazy(() => import("@/app/pages/admin/LeagueResults"));
const LeagueParticipants = lazy(() => import("@/app/pages/admin/LeagueParticipants"));
const LeagueFinaleRegistrations = lazy(() => import("@/app/pages/admin/LeagueFinaleRegistrations"));
const LeagueChangeRequests = lazy(() => import("@/app/pages/admin/LeagueChangeRequests"));
const LeagueCodes = lazy(() => import("@/app/pages/admin/LeagueCodes"));
const LeagueMastercodes = lazy(() => import("@/app/pages/admin/LeagueMastercodes"));
const LeagueRoutes = lazy(() => import("@/app/pages/admin/LeagueRoutes"));
const LeagueSettings = lazy(() => import("@/app/pages/admin/LeagueSettings"));
const LeagueRouteFeedback = lazy(() => import("@/app/pages/admin/LeagueRouteFeedback"));

export const appRoutes = (
  <>
    <Route element={<AuthLayout />}>
      <Route path="/app/login" element={<Login />} />
      <Route path="/app/register" element={<Register />} />
      <Route path="/app/register/success" element={<RegisterSuccess />} />
      <Route path="/app/auth/confirm" element={<EmailConfirm />} />
      <Route path="/app/auth/reset-password" element={<ResetPassword />} />
      <Route path="/app/invite/gym/:token" element={<GymInvite />} />
    </Route>

    <Route
      path="/app"
      element={
        <ProtectedRoute>
          <ParticipantLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Home />} />
      <Route
        path="gyms"
        element={isParticipantFeatureLocked() ? <FeatureLocked title="Hallenbereich folgt zum Saisonstart" /> : <Gyms />}
      />
      <Route
        path="gyms/redeem"
        element={isParticipantFeatureLocked() ? <FeatureLocked title="Code-Einlösung folgt zum Saisonstart" /> : <GymRedeem />}
      />
      <Route
        path="participation/redeem"
        element={isParticipantFeatureLocked() ? <FeatureLocked title="Mastercode-Einlösung folgt zum Saisonstart" /> : <MastercodeRedeem />}
      />
      <Route
        path="gyms/:gymId"
        element={isParticipantFeatureLocked() ? <FeatureLocked title="Hallen-Details folgen zum Saisonstart" /> : <GymDetail />}
      />
      <Route
        path="gyms/:gymId/routes"
        element={isParticipantFeatureLocked() ? <FeatureLocked title="Routenbereich folgt zum Saisonstart" /> : <GymRoutes />}
      />
      <Route
        path="gyms/:gymId/routes/:routeId/result"
        element={isParticipantFeatureLocked() ? <FeatureLocked title="Ergebniseintragung folgt zum Saisonstart" /> : <ResultEntry />}
      />
      <Route
        path="rankings"
        element={isParticipantFeatureLocked() ? <FeatureLocked title="Ranglisten folgen zum Saisonstart" /> : <Rankings />}
      />
      <Route
        path="age-group-rankings"
        element={isParticipantFeatureLocked() ? <FeatureLocked title="Altersklassenranglisten folgen zum Saisonstart" /> : <AgeGroupRankings />}
      />
      <Route
        path="finale"
        element={isParticipantFeatureLocked() ? <FeatureLocked title="Finale-Bereich folgt zum Saisonstart" /> : <Finale />}
      />
      <Route path="profile" element={<Profile />} />
    </Route>

    <Route
      path="/app/admin"
      element={
        <ProtectedRoute>
          <RoleGuard allow={["gym_admin", "league_admin"]}>
            <AdminLayout />
          </RoleGuard>
        </ProtectedRoute>
      }
    >
      <Route index element={<AdminHome />} />
      <Route
        path="gym"
        element={
          <RoleGuard allow={["gym_admin"]}>
            <GymAdminDashboard />
          </RoleGuard>
        }
      />
      <Route
        path="gym/profile"
        element={
          <RoleGuard allow={["gym_admin"]}>
            <GymProfile />
          </RoleGuard>
        }
      />
      <Route
        path="gym/routes"
        element={
          <RoleGuard allow={["gym_admin"]}>
            <GymRoutesAdmin />
          </RoleGuard>
        }
      />
      <Route
        path="gym/codes"
        element={
          <RoleGuard allow={["gym_admin"]}>
            <GymCodes />
          </RoleGuard>
        }
      />
      <Route
        path="gym/mastercodes"
        element={
          <RoleGuard allow={["gym_admin"]}>
            <GymMastercodes />
          </RoleGuard>
        }
      />
      <Route
        path="gym/stats"
        element={
          <RoleGuard allow={["gym_admin"]}>
            <GymStats />
          </RoleGuard>
        }
      />
      <Route
        path="league"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueDashboard />
          </RoleGuard>
        }
      />
      <Route
        path="league/season"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueSeason />
          </RoleGuard>
        }
      />
      <Route
        path="league/gyms"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueGyms />
          </RoleGuard>
        }
      />
      <Route
        path="league/participants"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueParticipants />
          </RoleGuard>
        }
      />
      <Route
        path="league/classes"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueClasses />
          </RoleGuard>
        }
      />
      <Route
        path="league/routes"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueRoutes />
          </RoleGuard>
        }
      />
      <Route
        path="league/results"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueResults />
          </RoleGuard>
        }
      />
      <Route
        path="league/route-feedback"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueRouteFeedback />
          </RoleGuard>
        }
      />
      <Route
        path="league/finale"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueFinaleRegistrations />
          </RoleGuard>
        }
      />
      <Route
        path="league/change-requests"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueChangeRequests />
          </RoleGuard>
        }
      />
      <Route
        path="league/codes"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueCodes />
          </RoleGuard>
        }
      />
      <Route
        path="league/mastercodes"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueMastercodes />
          </RoleGuard>
        }
      />
      <Route
        path="league/settings"
        element={
          <RoleGuard allow={["league_admin"]}>
            <LeagueSettings />
          </RoleGuard>
        }
      />
    </Route>

    <Route path="/app/*" element={<Navigate to="/app" replace />} />
  </>
);
