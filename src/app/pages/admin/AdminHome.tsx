import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";

const AdminHome = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  // Automatische Weiterleitung
  useEffect(() => {
    if (role === "gym_admin") {
      navigate("/app/admin/gym", { replace: true });
    } else if (role === "league_admin") {
      navigate("/app/admin/league", { replace: true });
    }
  }, [role, navigate]);

  return null;
};

export default AdminHome;
