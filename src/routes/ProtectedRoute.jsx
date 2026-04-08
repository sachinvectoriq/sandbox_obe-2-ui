import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const ProtectedRoute = ({ children, requireReportsAccess = false }) => {
  const { user } = useAuth();

  // ✅ Works with both SSO and hardcoded users
  const group = user?.group || JSON.parse(localStorage.getItem("group") || '""');
  const hasAccess = JSON.parse(localStorage.getItem("hasReportAccess") || "false");

  // Admins always have access
  if (group === "admin") return children;

  // Report route protection
  if (requireReportsAccess && !hasAccess) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default ProtectedRoute;