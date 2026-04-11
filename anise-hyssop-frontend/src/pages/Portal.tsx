import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogOut, User, MapPin, Mail, Calendar, Lock, Shield, Trash2, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Portal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetch(`/api/user/profile?email=${encodeURIComponent(user.email)}`)
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setProfileData(data.user);
            setMemberships(data.memberships || []);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch profile", err);
          setLoading(false);
        });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await fetch(`/api/user/profile?email=${encodeURIComponent(user.email)}`, {
          method: "DELETE"
        });
        logout();
        navigate("/");
      } catch (error) {
        console.error("Failed to delete account", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-stone-50)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-rewild-green)]">Loading...</div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-[var(--color-stone-50)] flex items-center justify-center flex-col gap-4">
        <p className="text-stone-600">Profile not found or deleted.</p>
        <button onClick={handleLogout} className="text-[var(--color-rewild-green)] underline">Return to Login</button>
      </div>
    );
  }

  const ageGroup = profileData.isDeleted ? profileData.retainedAgeGroup : (profileData.isAdult ? "Adult" : "Youth");

  return (
    <div className="pb-12 relative overflow-hidden h-full">
      {/* Subtle Native Plant Background (Abstract SVG) */}
      <div className="absolute inset-0 pointer-events-none text-[#2D5A27]/5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="leaves-portal" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 10 Q60 30 50 50 Q40 30 50 10 Z" fill="currentColor" transform="rotate(45 50 50)" />
              <path d="M20 60 Q30 80 20 100 Q10 80 20 60 Z" fill="currentColor" transform="rotate(-30 20 80)" />
              <path d="M80 40 Q90 60 80 80 Q70 60 80 40 Z" fill="currentColor" transform="rotate(15 80 60)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#leaves-portal)" />
        </svg>
      </div>

      <main className="max-w-5xl mx-auto px-6 mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-md p-6 border border-stone-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-[var(--color-rewild-green)]"></div>
            
            <div className="flex justify-between items-start mb-6 mt-2">
              <h2 className="text-xl font-bold text-stone-800">
                {profileData.firstName} {profileData.lastName}
              </h2>
              <button className="text-stone-400 hover:text-[var(--color-rewild-green)] transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-stone-400 mt-0.5" />
                <div>
                  <p className="text-sm text-stone-800">{profileData.town}, NY {profileData.zipCode}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-stone-400" />
                <p className="text-sm text-stone-800 break-all">{profileData.email}</p>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <div className="flex items-center gap-3 mb-1">
                  <Shield className="w-5 h-5 text-[var(--color-earth-sand)]" />
                  <p className="text-sm font-medium text-stone-800">{ageGroup} Volunteer</p>
                </div>
                <p className="text-xs text-stone-500 ml-8">Visible to organization administrators</p>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <button 
                  onClick={() => alert("Password change flow would open here.")}
                  className="flex items-center gap-3 text-sm font-medium text-stone-600 hover:text-[var(--color-rewild-green)] transition-colors w-full text-left"
                >
                  <Lock className="w-5 h-5 text-stone-400" />
                  Change Password
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={handleDeleteAccount}
            className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 py-3 rounded-xl transition-colors text-sm font-medium border border-transparent hover:border-red-100"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>

        {/* Right Column: Teams */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-2xl font-bold text-[var(--color-rewild-green)]">Your Teams</h2>
            <button className="text-sm font-medium text-[var(--color-earth-sand)] hover:underline">
              Manage Memberships
            </button>
          </div>

          {memberships.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm p-8 border border-stone-100 text-center">
              <p className="text-stone-500 mb-4">You are not currently assigned to any teams.</p>
              <button className="bg-[var(--color-rewild-green)] text-white px-6 py-2 rounded-xl text-sm font-medium">
                Join a Team
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group by Team Type */}
              {["Chapter", "Committee", "Program"].map(type => {
                const typeMemberships = memberships.filter(m => m.teamType === type);
                if (typeMemberships.length === 0) return null;

                return (
                  <div key={type} className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                    <div className="bg-stone-50 px-6 py-3 border-b border-stone-100">
                      <h3 className="font-semibold text-stone-700">{type}s</h3>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {typeMemberships.map(m => (
                        <div key={m.id} className="p-6 flex justify-between items-center hover:bg-stone-50/50 transition-colors">
                          <div>
                            <h4 className="font-bold text-stone-800 mb-1">{m.teamName}</h4>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {m.role}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-stone-400">Joined</p>
                            <p className="text-sm text-stone-600">{new Date(m.assignedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
