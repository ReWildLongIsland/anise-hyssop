import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "../context/AuthContext";
import { Leaf, ArrowRight } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function Landing() {
  const { loginWithRedirect } = useAuth0();
  const { isAuthenticated, isLoading, isNewUser } = useAuth();

  // Redirect already-authenticated users
  if (!isLoading && isAuthenticated) {
    return <Navigate to={isNewUser ? "/register" : "/portal"} replace />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-stone-50)] flex flex-col relative overflow-hidden">
      {/* Subtle Native Plant Background */}
      <div className="absolute inset-0 pointer-events-none text-[#2D5A27]/5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="leaves" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 10 Q60 30 50 50 Q40 30 50 10 Z" fill="currentColor" transform="rotate(45 50 50)" />
              <path d="M20 60 Q30 80 20 100 Q10 80 20 60 Z" fill="currentColor" transform="rotate(-30 20 80)" />
              <path d="M80 40 Q90 60 80 80 Q70 60 80 40 Z" fill="currentColor" transform="rotate(15 80 60)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#leaves)" />
        </svg>
      </div>

      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <img
            src="/Branding/logo-banner.png"
            alt="ReWild Long Island"
            className="h-12 md:h-20 lg:h-24 object-contain transition-all"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div className="hidden flex items-center gap-2 text-[var(--color-rewild-green)]">
            <Leaf className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight">ReWild Long Island</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6 z-10">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-md p-8 border border-stone-100">
          <div className="text-center mb-8">
            <img
              src="/Branding/logo-circle.png"
              alt="ReWild Logo"
              className="w-24 h-24 mx-auto mb-4 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <h1 className="text-3xl font-bold text-[var(--color-rewild-green)] mb-2">Anise Hyssop</h1>
            <p className="text-stone-500">Volunteer Management Portal</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: "signup" } })}
              className="w-full bg-[var(--color-rewild-green)] hover:bg-[var(--color-rewild-green-light)] text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              Register
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => loginWithRedirect()}
              className="w-full bg-white hover:bg-stone-50 text-[var(--color-rewild-green)] font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-[var(--color-rewild-green)] shadow-sm"
            >
              Already have an account? Log in.
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-400">
              By continuing, you agree to ReWild Long Island's Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
