import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Leaf, LogOut } from "lucide-react";

export default function Navigation({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isAdmin = user?.globalRole === "Admin";

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Global Header */}
      <header className="w-full bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <img 
                src="/Branding/logo-circle.png" 
                alt="ReWild Logo" 
                className="w-10 h-10 object-contain" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }} 
              />
              <div className="hidden flex items-center gap-2 text-[#2D5A27]">
                <Leaf className="w-6 h-6" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[#2D5A27]">
                ReWild Long Island
              </span>
            </div>

            {/* Two-Hat Toggle (Admin Only) */}
            {isAdmin && (
              <div className="hidden md:flex bg-stone-100 p-1 rounded-xl">
                <button
                  onClick={() => navigate("/portal")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === "/portal"
                      ? "bg-white text-[#2D5A27] shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  My Portal
                </button>
                <button
                  onClick={() => navigate("/admin")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === "/admin"
                      ? "bg-white text-[#2D5A27] shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  Management Dashboard
                </button>
              </div>
            )}

            {/* Logout */}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Two-Hat Toggle */}
        {isAdmin && (
          <div className="md:hidden border-t border-stone-100 bg-stone-50 px-4 py-2 flex gap-2 overflow-x-auto">
            <button
              onClick={() => navigate("/portal")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                location.pathname === "/portal"
                  ? "bg-white text-[#2D5A27] shadow-sm border border-stone-200"
                  : "text-stone-500 hover:bg-stone-100"
              }`}
            >
              My Portal
            </button>
            <button
              onClick={() => navigate("/admin")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                location.pathname === "/admin"
                  ? "bg-white text-[#2D5A27] shadow-sm border border-stone-200"
                  : "text-stone-500 hover:bg-stone-100"
              }`}
            >
              Management Dashboard
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow relative">
        {children}
      </main>
    </div>
  );
}
