import { LogOut, User, Settings, Home, HelpCircle, BarChart3 } from "lucide-react";
import Logo from './Logo';
import axios from "axios";
import useAuth from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

const API_BASE = 'https://app-ka-sandbox-001.azurewebsites.net/';

const Header = () => {
  const { logoutUser, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [hasReportAccess, setHasReportAccess] = useState(false);
  const helpDropdownRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const isSettingsPage = location.pathname === '/settings2';
  const isReportsPage = location.pathname === '/reports';

  // Check if user has report access
  useEffect(() => {
  const fetchReportAccess = async () => {

    // Admins always get access
    if (user?.group === "admin") {
      setHasReportAccess(true);
      localStorage.setItem("hasReportAccess", "true");
      return;
    }

    const storedEmail = JSON.parse(localStorage.getItem("email") || "null");
    const emailToCheck = user?.email || storedEmail;

    if (!emailToCheck) {
      setHasReportAccess(false);
      localStorage.setItem("hasReportAccess", "false");
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/api/report-access/all`, {
        params: { limit: 100 },
      });

      const accessList = response.data.records || [];

      const allowed = accessList.some(
        (u) => u.email?.toLowerCase() === emailToCheck.toLowerCase()
      );

      setHasReportAccess(allowed);
      localStorage.setItem("hasReportAccess", JSON.stringify(allowed)); // <-- REQUIRED
    } catch (error) {
      console.error("Error checking report access:", error);
      setHasReportAccess(false);
      localStorage.setItem("hasReportAccess", "false");
    }
  };

  const timer = setTimeout(fetchReportAccess, 250); // give time for useAuth restore
  return () => clearTimeout(timer);

}, [user?.email, user?.group]);



  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(event.target)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Logout
  const handleLogout = () => {
    logoutUser();
    localStorage.clear();
    navigate('/');
  };

  // Toggle for Settings ↔ Home
  const handleNavToggle = () => {
    navigate(isSettingsPage ? '/home' : '/settings2');
  };

  // Toggle for Reports ↔ Home
  const handleReportsToggle = () => {
    navigate(isReportsPage ? '/home' : '/reports');
  };

  // Help dropdown control
  const goToQuickTour = () => {
    window.open('/quick-tour', '_blank');
    setHelpOpen(false);
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHelpOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHelpOpen(false), 400);
  };

  return (
    <div id="header" className="bg-white sticky top-0 w-full z-50 p-2">
      <div className="container p-4 w-[95%] max-w-[1400px] mx-auto flex justify-between items-center">
        <Logo />
        <h1 className="text-3xl font-semibold text-[#fcbc19]">
          OBE Knowledge Assistant
        </h1>

        <div className="flex items-center gap-4">

          {/* Settings Button (Admins only) */}
          {user?.group === 'admin' && (
            <button
              onClick={handleNavToggle}
              className="border border-gray-100 bg-gray-100 font-semibold hover:border-[#174a7e] text-[#174a7e] p-2 px-4 rounded-md flex items-center gap-2 transition-colors"
            >
              {isSettingsPage ? <Home size={18} /> : <Settings size={18} />}
              {isSettingsPage ? 'Home' : 'Settings'}
            </button>
          )}

          {/* Reports Button (Admins + Users with granted access) */}
          {hasReportAccess && (
            <button
              onClick={handleReportsToggle}
              className="border border-gray-100 bg-gray-100 font-semibold hover:border-[#174a7e] text-[#174a7e] p-2 px-4 rounded-md flex items-center gap-2 transition-colors"
            >
              {isReportsPage ? <Home size={18} /> : <BarChart3 size={18} />}
              {isReportsPage ? 'Home' : 'Reports'}
            </button>
          )}

          {/* Help Dropdown */}
          <div 
            className="relative"
            ref={helpDropdownRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className="border border-gray-100 bg-gray-100 font-semibold text-[#174a7e] p-2 px-4 rounded-md flex items-center gap-2 hover:border-[#174a7e] transition-colors"
            >
              <HelpCircle size={18} />
              Help
            </button>
            {helpOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white shadow-lg rounded-lg border border-gray-200 z-50 py-2">
                <button
                  onClick={goToQuickTour}
                  className="block w-full text-left px-4 py-3 text-[#174a7e] hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Quick Tour
                </button>
              </div>
            )}
          </div>

          {/* User Display */}
          <h1 className="border border-gray-100 bg-gray-100 font-semibold hover:border-[#174a7e] text-[#174a7e] p-2 px-4 rounded-md flex items-center gap-2 transition-colors">
            <User />
            {user ? user.name : 'Test User'}
          </h1>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="border border-[#174a7e] bg-white font-semibold text-[#174a7e] p-2 px-4 rounded-md flex items-center gap-2 hover:bg-[#082340] hover:text-white transition-colors"
          >
            <span>Logout</span>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;

