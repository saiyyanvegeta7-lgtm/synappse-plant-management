import React, { useEffect, useState } from 'react';
import { 
  Users, UserCheck, Shield, ShieldAlert, Search, 
  Building2, Award, CheckCircle, RefreshCw, AlertCircle, ChevronDown, 
  MapPin, SlidersHorizontal, Lock, Check, Mail, Info
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { UserService } from '../lib/UserService';
import { UserProfile, UserRole } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export default function UserManagementView() {
  const { profile: currentAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  // Load registered users with real-time Firestore sync
  useEffect(() => {
    setLoading(true);
    const unsubscribe = UserService.subscribeToUsers(
      (data) => {
        setUsers(data);
        setLoading(false);
      },
      (error) => {
        toast.error('Failed to load user directory');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Secure validation - double check admin status
  if (currentAdmin?.role !== 'admin' && currentAdmin?.email !== 'purandhar@patilgroup.com') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#0c1017] border border-red-500/20 rounded-2xl max-w-xl mx-auto">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-[#dde6f0] mb-2 uppercase tracking-wider font-sans">Access Prohibited</h3>
        <p className="text-sm text-[#7a95b0] text-center leading-relaxed">
          This User Hierarchy Control Panel holds restricted administrative permissions. Only the Super Administrator (<strong className="text-[#00e5c3]">purandhar@patilgroup.com</strong>) has access to modify team hierarchies.
        </p>
      </div>
    );
  }

  // Handle setting user department/roles/approvalLevel
  const handleUpdate = async (uid: string, updates: Partial<UserProfile>) => {
    // Prevent the master admin from demoting themselves accidentally
    const targetUser = users.find(u => u.uid === uid);
    if (targetUser?.email === 'purandhar@patilgroup.com' && (updates.role || updates.approvalLevel !== undefined)) {
      toast.error('Security Restriction: The primary Super Admin account cannot be demoted or role-modified!');
      return;
    }

    setUpdatingUid(uid);
    try {
      await UserService.updateUserRoleAndHierarchy(uid, updates);
      toast.success('Hierarchy updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Database write failed');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Pre-calculations for analytics
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const approverCount = users.filter(u => u.role === 'approver').length;
  const requesterCount = users.filter(u => u.role === 'requester').length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.dept || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (roleFilter === 'all') return matchesSearch;
    return matchesSearch && u.role === roleFilter;
  });

  const availableDepartments = [
    'General', 'HOD Office', 'Operations', 'Maintenance', 'HSE / Safety', 
    'Mechanical Engg.', 'Electrical Engg.', 'Instrumentation', 'Procurement', 'Quality Assurance'
  ];

  return (
    <div className="space-y-8">
      {/* Intro block */}
      <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#ff9f1c]/5 rounded-bl-full pointer-events-none" />
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#ff9f1c]">ADMINISTRATION CENTRAL</span>
        <h2 className="text-xl font-bold font-sans text-[#dde6f0] mt-1 mb-2">User Directory & Hierarchy Control Panel</h2>
        <p className="text-sm text-[#7a95b0] leading-relaxed max-w-4xl">
          Complete administrative governance for Synapse. To add secondary administrators, plant engineers, or team members, have them log in to the application. They will immediately show up in this directory as standard <strong className="text-[#2d9cff]">Requesters</strong>, allowing you to easily promote them to active validators.
        </p>
      </div>

      {/* Metric Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#141c28]/40 border border-[#1f2d40] p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#7a95b0] font-bold">Total Operations Users</span>
              <h3 className="text-2xl font-bold text-[#dde6f0] mt-1">{totalUsers}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-[#2d9cff]/10 text-[#2d9cff]">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#141c28]/40 border border-[#1f2d40] p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#ff9f1c] font-bold">Active Approvers</span>
              <h3 className="text-2xl font-bold text-[#ff9f1c] mt-1">{approverCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-[#ff9f1c]/10 text-[#ff9f1c]">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#141c28]/40 border border-[#1f2d40] p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#ef476f] font-bold">Super Administrators</span>
              <h3 className="text-2xl font-bold text-[#ef476f] mt-1">{adminCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-[#ef476f]/10 text-[#ef476f]">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#141c28]/40 border border-[#1f2d40] p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#2d9cff] font-bold">Requesters / Staff</span>
              <h3 className="text-2xl font-bold text-[#2d9cff] mt-1">{requesterCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-[#2d9cff]/10 text-[#2d9cff]">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Sequential Hierarchy Informational banner */}
      <div className="bg-[#141c28]/80 border border-[#1f2d40] rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#00e5c3]/10 text-[#00e5c3] mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#dde6f0] uppercase tracking-wider font-sans mb-1.5">Sequential 3-Stage Approval Routing Matrix Explained</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
              <div className="bg-[#0c1017] p-3 rounded-lg border border-[#1f2d40]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-[#ff9f1c]/20 text-[#ff9f1c] flex items-center justify-center text-xs font-bold font-mono">1</span>
                  <span className="text-xs font-bold text-[#dde6f0]">Level 1: Plant Engineer</span>
                </div>
                <p className="text-[11px] text-[#7a95b0] leading-relaxed">
                  First active reviewer block. Plant engineers evaluate exact engineering/maintenance layouts and initial compliance points.
                </p>
              </div>

              <div className="bg-[#0c1017] p-3 rounded-lg border border-[#1f2d40]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-[#ff9f1c]/20 text-[#ff9f1c] flex items-center justify-center text-xs font-bold font-mono">2</span>
                  <span className="text-xs font-bold text-[#dde6f0]">Level 2: HO Engg. Dept</span>
                </div>
                <p className="text-[11px] text-[#7a95b0] leading-relaxed">
                  Second active reviewer block. Centralized engineering department certifies corporate cost alignment and procurement codes.
                </p>
              </div>

              <div className="bg-[#0c1017] p-3 rounded-lg border border-[#1f2d40]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-[#ef476f]/20 text-[#ef476f] flex items-center justify-center text-xs font-bold font-mono">3</span>
                  <span className="text-xs font-bold text-[#dde6f0]">Level 3: Plant Head / Admin</span>
                </div>
                <p className="text-[11px] text-[#7a95b0] leading-relaxed">
                  Ultimate sign-off reviewer block. Plant Head gives absolute operational authorization, pushing items to finalized statuses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Table Area */}
      <div className="border border-[#1f2d40] rounded-xl overflow-hidden bg-[#0c1017]">
        {/* Table Header Controls */}
        <div className="p-4 bg-[#141c28] border-b border-[#1f2d40] flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-3 flex items-center text-[#7a95b0]">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#07090d] border border-[#1f2d40] rounded-xl text-xs text-[#dde6f0] focus:outline-none focus:border-[#00e5c3] placeholder-[#3d5570]"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-end">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-[#07090d] border border-[#1f2d40] rounded-xl text-xs text-[#dde6f0] focus:outline-none focus:border-[#00e5c3]"
            >
              <option value="all">Role: All Users</option>
              <option value="requester">Role: Requesters Only</option>
              <option value="approver">Role: Approvers Only</option>
              <option value="admin">Role: Admins Only</option>
            </select>
          </div>
        </div>

        {/* Live List Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#7a95b0] gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-[#00e5c3]" />
            <span className="text-xs font-mono">Accessing Synapse Register...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#7a95b0] gap-2">
            <AlertCircle className="w-8 h-8 text-[#ff9f1c]" />
            <span className="text-xs font-mono">No users found matching requirements</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1f2d40] bg-[#141c28]/40 text-[10px] font-mono uppercase text-[#7a95b0] font-bold">
                  <th className="py-3.5 px-5">Team Member Name & Mail</th>
                  <th className="py-3.5 px-5 text-center">App Role</th>
                  <th className="py-3.5 px-5 text-center">Hierarchy / Level</th>
                  <th className="py-3.5 px-4 text-center">Department Segment</th>
                  <th className="py-3.5 px-5 text-right w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d40]/40">
                {filteredUsers.map((user) => {
                  const isPrimaryAdmin = user.email === 'purandhar@patilgroup.com';
                  return (
                    <tr 
                      key={user.uid} 
                      className={cn(
                        "hover:bg-[#141c28]/25 transition-all text-xs",
                        isPrimaryAdmin ? "bg-[#ef476f]/5" : ""
                      )}
                    >
                      {/* Name & Mail */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00e5c3] to-[#2d9cff] flex items-center justify-center text-[#07090d] font-bold text-xs shrink-0 select-none">
                            {user.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-[#dde6f0]">
                              <span>{user.name}</span>
                              {isPrimaryAdmin && (
                                <span className="bg-[#ef476f] text-white text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-widest font-mono">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#7a95b0] flex items-center gap-1 mt-0.5 font-mono">
                              <Mail className="w-3 h-3 text-[#3d5570]" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* App Role Option Selector */}
                      <td className="py-3 px-5 text-center">
                        <select
                          disabled={isPrimaryAdmin || updatingUid === user.uid}
                          value={user.role}
                          onChange={(e) => {
                            const newRole = e.target.value as UserRole;
                            // Reset levels if made requester to avoid leaks
                            const newLevel = newRole === 'requester' ? 0 : newRole === 'admin' ? 3 : 1;
                            handleUpdate(user.uid, { role: newRole, approvalLevel: newLevel });
                          }}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg border text-[11px] font-bold outline-none cursor-pointer focus:border-[#00e5c3] disabled:opacity-50 disabled:cursor-not-allowed mx-auto block bg-[#07090d]",
                            user.role === 'admin' 
                              ? "border-[#ef476f]/30 text-[#ef476f] bg-[#ef476f]/5" 
                              : user.role === 'approver' 
                              ? "border-[#ff9f1c]/30 text-[#ff9f1c] bg-[#ff9f1c]/5" 
                              : "border-[#1f2d40] text-[#7a95b0]"
                          )}
                        >
                          <option value="requester">Standard Requester</option>
                          <option value="approver">Active Approver</option>
                          <option value="admin">System Admin</option>
                        </select>
                      </td>

                      {/* Approval Level Matrix selector */}
                      <td className="py-3 px-5 text-center">
                        {user.role === 'requester' ? (
                          <span className="text-[11px] text-[#5a6e85] font-mono">Level 0: No Approvals Allowed</span>
                        ) : (
                          <select
                            disabled={isPrimaryAdmin || updatingUid === user.uid || user.role === 'requester'}
                            value={user.approvalLevel || 0}
                            onChange={(e) => handleUpdate(user.uid, { approvalLevel: Number(e.target.value) })}
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg border text-[11px] font-bold outline-none cursor-pointer focus:border-[#00e5c3] bg-[#07090d] mx-auto block disabled:opacity-50",
                              user.approvalLevel === 3 ? "border-[#ef476f]/30 text-[#ef476f]" : "border-[#ff9f1c]/30 text-[#ff9f1c]"
                            )}
                          >
                            <option value={1}>L1: Plant Engineer</option>
                            <option value={2}>L2: HO Engg. Dept</option>
                            <option value={3}>L3: Plant Head / Admin</option>
                          </select>
                        )}
                      </td>

                      {/* Department Select dropdown */}
                      <td className="py-3 px-4 text-center">
                        <select
                          disabled={updatingUid === user.uid}
                          value={user.dept || 'General'}
                          onChange={(e) => handleUpdate(user.uid, { dept: e.target.value })}
                          className="px-2.5 py-1.5 bg-[#07090d] border border-[#1f2d40] rounded-lg text-[11px] text-[#dde6f0] focus:outline-none focus:border-[#00e5c3] outline-none mx-auto block max-w-[150px]"
                        >
                          {availableDepartments.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </td>

                      {/* Action state indicator */}
                      <td className="py-3 px-5 text-right font-mono text-[10px]">
                        {updatingUid === user.uid ? (
                          <div className="flex items-center justify-end gap-1.5 text-[#ff9f1c]">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 text-[#06d6a0]">
                            <Check className="w-3.5 h-3.5" />
                            <span>Configured</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#0f1520] border border-[#1f2d40] rounded-xl p-5 text-xs text-[#7a95b0] flex gap-2 items-center">
        <Lock className="w-4 h-4 text-[#ff9f1c] shrink-0" />
        <p>
          <strong>Security Note:</strong> All changes to user roles write synchronously to Google Firestore. Security rules validate that only admins authenticated with Google matching your tenant profile can push database alterations.
        </p>
      </div>
    </div>
  );
}
