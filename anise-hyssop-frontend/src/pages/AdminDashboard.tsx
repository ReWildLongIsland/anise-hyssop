import React, { useState, useEffect } from 'react';
import { Search, Edit2, X, Shield, RefreshCw } from 'lucide-react';

const AdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form state for edit modal
  const [editForm, setEditForm] = useState({
    email: '',
    dateOfBirth: '',
    isAdult: true,
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      dateOfBirth: user.dateOfBirth || '',
      isAdult: user.isAdult,
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
  };

  const handleSaveProfile = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        fetchUsers();
        setEditingUser({ ...editingUser, ...editForm });
      }
    } catch (err) {
      console.error("Failed to update user", err);
    }
  };

  const handleResetWaiver = async () => {
    if (!editingUser) return;
    if (window.confirm("Are you sure you want to reset this user's waiver? They will be forced to re-sign on next login.")) {
      try {
        const res = await fetch(`/api/admin/users/${editingUser.id}/waiver`, {
          method: 'PUT',
        });
        if (res.ok) {
          fetchUsers();
          setEditingUser({ ...editingUser, waiverSignedAt: null });
          alert("Waiver reset successfully.");
        }
      } catch (err) {
        console.error("Failed to reset waiver", err);
      }
    }
  };

  const handlePromote = async (membershipId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/memberships/${membershipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchUsers();
        // Update local state for immediate feedback
        setEditingUser((prev: any) => ({
          ...prev,
          memberships: prev.memberships.map((m: any) => 
            m.id === membershipId ? { ...m, role: newRole } : m
          )
        }));
      }
    } catch (err) {
      console.error("Failed to promote user", err);
    }
  };

  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 bg-stone-50 min-h-screen text-stone-800 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2D5A27]">Management Dashboard</h1>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400" />
            <input 
              type="text" 
              placeholder="Search volunteers..." 
              className="pl-10 pr-4 py-2 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-[#2D5A27] focus:outline-none w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-stone-500">Loading users...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-sm font-semibold text-stone-600">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Age Group</th>
                  <th className="p-4">Waiver Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-4 font-medium text-stone-800">{user.firstName} {user.lastName}</td>
                    <td className="p-4 text-stone-600">{user.email}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isAdult ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {user.isAdult ? 'Adult' : 'Youth'}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.waiverSignedAt ? (
                        <span className="text-green-600 text-sm font-medium">Signed</span>
                      ) : (
                        <span className="text-orange-600 text-sm font-medium">Pending</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="text-[#2D5A27] hover:bg-green-50 p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium"
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Modal */}
      {editingUser && (
        <>
          <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40" onClick={closeEditModal} />
          <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 ease-in-out border-l border-stone-200">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 text-[#2D5A27]">
                <Shield className="w-5 h-5" />
                <h2 className="text-xl font-bold">Superpower Edit</h2>
              </div>
              <button onClick={closeEditModal} className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Profile Overrides */}
              <section>
                <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-4">Profile Overrides</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#2D5A27] focus:outline-none"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <div>
                      <p className="text-sm font-medium text-stone-800">Age Group Classification</p>
                      <p className="text-xs text-stone-500">Override calculated status</p>
                    </div>
                    <select 
                      value={editForm.isAdult ? "true" : "false"}
                      onChange={(e) => setEditForm({...editForm, isAdult: e.target.value === "true"})}
                      className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#2D5A27] focus:outline-none"
                    >
                      <option value="true">Adult (18+)</option>
                      <option value="false">Youth (&lt;18)</option>
                    </select>
                  </div>

                  {!editForm.isAdult && (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Date of Birth</label>
                      <input 
                        type="date" 
                        value={editForm.dateOfBirth}
                        onChange={(e) => setEditForm({...editForm, dateOfBirth: e.target.value})}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#2D5A27] focus:outline-none"
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleSaveProfile}
                    className="w-full bg-[#2D5A27] text-white py-2 rounded-lg font-medium hover:bg-[#23471f] transition-colors"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </section>

              {/* Membership Management */}
              <section>
                <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-4">Team Memberships</h3>
                <div className="space-y-3">
                  {editingUser.memberships?.length === 0 ? (
                    <p className="text-sm text-stone-500 italic">No active memberships.</p>
                  ) : (
                    editingUser.memberships?.map((m: any) => (
                      <div key={m.id} className="p-3 border border-stone-200 rounded-lg flex justify-between items-center bg-stone-50">
                        <div>
                          <p className="font-medium text-stone-800 text-sm">{m.teamName}</p>
                          <p className="text-xs text-stone-500">{m.teamType} • {m.role}</p>
                        </div>
                        
                        {/* Promotion Logic */}
                        {m.role.includes("Prospect") && (
                          <button 
                            onClick={() => handlePromote(m.id, m.teamType === "Committee" ? "Member" : "Volunteer")}
                            className="text-xs font-medium bg-[#F4A460] text-white px-3 py-1.5 rounded-md hover:bg-[#e09658] transition-colors"
                          >
                            Promote to {m.teamType === "Committee" ? "Member" : "Volunteer"}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Compliance & Safety */}
              <section>
                <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-4">Compliance</h3>
                <div className="p-4 border border-red-100 bg-red-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-red-900 text-sm">Liability Waiver</p>
                      <p className="text-xs text-red-700 mt-1">
                        Status: {editingUser.waiverSignedAt ? `Signed on ${new Date(editingUser.waiverSignedAt).toLocaleDateString()}` : 'Not Signed'}
                      </p>
                    </div>
                    <button 
                      onClick={handleResetWaiver}
                      disabled={!editingUser.waiverSignedAt}
                      className="flex items-center gap-1 text-xs font-medium bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                  <p className="text-xs text-red-600 mt-3">
                    Resetting the waiver will force the user to re-sign the liability agreement upon their next login.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;