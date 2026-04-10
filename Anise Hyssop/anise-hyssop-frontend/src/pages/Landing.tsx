import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Leaf, ArrowRight, Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const { login, checkEmail, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [error, setError] = useState("");

  // If already logged in, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      if (user?.isNewUser) navigate("/register");
      else navigate("/portal");
    }
  }, [isAuthenticated, user, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    
    if (!isLoginMode) {
      // In registration mode, we show the "Check Your Email" screen first
      setPendingEmail(email);
    } else {
      if (!showPasswordPrompt) {
        // Check if email exists
        const exists = await checkEmail(email);
        if (exists) {
          setShowPasswordPrompt(true);
        } else {
          setError("Account not found. Please register.");
        }
      } else {
        // Submit password
        const success = await login(email, password);
        if (!success) {
          setError("Invalid password.");
        }
      }
    }
  };

  const simulateEmailClick = async () => {
    await login(pendingEmail);
  };

  const handleForgotPassword = () => {
    alert("A password reset link has been sent to your email.");
  };

  return (
    <div className="min-h-screen bg-[var(--color-stone-50)] flex flex-col relative overflow-hidden">
      {/* Subtle Native Plant Background (Abstract SVG) */}
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
          <img src="/Branding/logo-banner.png" alt="ReWild Long Island" className="h-12 md:h-20 lg:h-24 object-contain transition-all" referrerPolicy="no-referrer" onError={(e) => {
            // Fallback if image not uploaded yet
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }} />
          <div className="hidden flex items-center gap-2 text-[var(--color-rewild-green)]">
            <Leaf className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight">ReWild Long Island</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6 z-10">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-md p-8 border border-stone-100">
          
          {pendingEmail ? (
            <div className="text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-[var(--color-rewild-green)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-rewild-green)] mb-3">Check Your Email</h2>
              <p className="text-stone-600 mb-8">
                We've sent a verification link to <strong className="text-stone-800">{pendingEmail}</strong>. 
                Please click the link to verify your account and continue registration.
              </p>
              
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200">
                <p className="text-xs text-stone-500 mb-4 uppercase tracking-wider font-semibold">
                  Mock Environment Action
                </p>
                <button 
                  onClick={simulateEmailClick}
                  className="w-full bg-[var(--color-earth-sand)] hover:bg-[#e69550] text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  Simulate Email Link Click
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <button 
                onClick={() => setPendingEmail("")}
                className="mt-6 text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <img src="/Branding/logo-circle.png" alt="ReWild Logo" className="w-24 h-24 mx-auto mb-4 object-contain" referrerPolicy="no-referrer" onError={(e) => e.currentTarget.style.display = 'none'} />
                <h1 className="text-3xl font-bold text-[var(--color-rewild-green)] mb-2">Anise Hyssop</h1>
                <p className="text-stone-500">Volunteer Management Portal</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                    {error}
                  </div>
                )}
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={showPasswordPrompt}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-rewild-green)] focus:border-transparent transition-all disabled:bg-stone-50 disabled:text-stone-500"
                    placeholder="volunteer@example.com"
                    required
                  />
                </div>
                
                {showPasswordPrompt && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-stone-400" />
                      </div>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-rewild-green)] focus:border-transparent transition-all"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-[var(--color-earth-sand)] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>
                )}
                
                <button
                  type="submit"
                  className="w-full bg-[var(--color-rewild-green)] hover:bg-[var(--color-rewild-green-light)] text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  {isLoginMode ? (showPasswordPrompt ? "Log In" : "Continue") : "Register"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    setShowPasswordPrompt(false);
                    setError("");
                  }}
                  className="text-sm text-[var(--color-earth-sand)] hover:underline font-medium"
                >
                  {isLoginMode ? "Need an account? Register here." : "Already have an account? Log in."}
                </button>
              </div>
              
              <div className="mt-8 pt-6 border-t border-stone-100 text-center">
                <p className="text-xs text-stone-400">
                  By continuing, you agree to ReWild Long Island's Terms of Service and Privacy Policy.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
