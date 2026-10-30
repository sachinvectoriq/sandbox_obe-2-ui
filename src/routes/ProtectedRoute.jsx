import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { isTokenValid } from '../utils/isTokenValid';

const ProtectedRoute = ({ children, requireReportsAccess = false }) => {
  const { user, token } = useAuth();

  if (!token || !isTokenValid(token)) {
    return <Navigate to="/" replace />;
  }

  const group = user?.group || JSON.parse(localStorage.getItem("group") || '""');
  const hasAccess = JSON.parse(localStorage.getItem("hasReportAccess") || "false");

  if (!group) {
    return <Navigate to="/" replace />;
  }

  if (group === "admin") return children;

  if (requireReportsAccess && !hasAccess) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default ProtectedRoute;
