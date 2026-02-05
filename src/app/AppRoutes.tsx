import { Route, Navigate } from "react-router-dom";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { ParticipantLayout } from "@/app/layouts/ParticipantLayout";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { ProtectedRoute, RoleGuard } from "@/app/auth/ProtectedRoute";
import Login from "@/app/pages/auth/Login";
import Register from "@/app/pages/auth/Register";
import GymInvite from "@/app/pages/auth/GymInvite";
import EmailConfirm from "@/app/pages/auth/EmailConfirm";
import Home from "@/app/pages/participant/Home";
import Gyms from "@/app/pages/participant/Gyms";
import GymDetail from "@/app/pages/participant/GymDetail";
import GymRedeem from "@/app/pages/participant/GymRedeem";
import GymRoutes from "@/app/pages/participant/GymRoutes";
import ResultEntry from "@/app/pages/participant/ResultEntry";
import Rankings from "@/app/pages/participant/Rankings";
import Profile from "@/app/pages/participant/Profile";
import Finale from "@/app/pages/participant/Finale";
import AdminHome from "@/app/pages/admin/AdminHome";
import GymAdminDashboard from "@/app/pages/admin/GymAdminDashboard";
import GymProfile from "@/app/pages/admin/GymProfile";
import GymRoutesAdmin from "@/app/pages/admin/GymRoutesAdmin";
import GymCodes from "@/app/pages/admin/GymCodes";
import GymStats from "@/app/pages/admin/GymStats";
import LeagueDashboard from "@/app/pages/admin/LeagueDashboard";
import LeagueSeason from "@/app/pages/admin/LeagueSeason";
import LeagueGyms from "@/app/pages/admin/LeagueGyms";
import LeagueClasses from "@/app/pages/admin/LeagueClasses";
import LeagueResults from "@/app/pages/admin/LeagueResults";
import LeagueParticipants from "@/app/pages/admin/LeagueParticipants";
import LeagueFinaleRegistrations from "@/app/pages/admin/LeagueFinaleRegistrations";
import LeagueChangeRequests from "@/app/pages/admin/LeagueChangeRequests";
import LeagueCodes from "@/app/pages/admin/LeagueCodes";
import LeagueRoutes from "@/app/pages/admin/LeagueRoutes";
import LeagueSettings from "@/app/pages/admin/LeagueSettings";

export const appRoutes = (
  <>
    <Route element={<AuthLayout />}>
      <Route path="/app/login" element={<Login />} />
      <Route path="/app/register" element={<Register />} />
      <Route path="/app/auth/confirm" element={<EmailConfirm />} />
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
        <Route path="gyms" element={<Gyms />} />
        <Route path="gyms/redeem" element={<GymRedeem />} />
        <Route path="gyms/:gymId" element={<GymDetail />} />
        <Route path="gyms/:gymId/routes" element={<GymRoutes />} />
        <Route path="gyms/:gymId/routes/:routeId/result" element={<ResultEntry />} />
        <Route path="rankings" element={<Rankings />} />
        <Route path="finale" element={<Finale />} />
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
