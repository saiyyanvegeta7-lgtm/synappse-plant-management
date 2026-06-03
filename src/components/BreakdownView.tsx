import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { RequestService } from '../lib/RequestService';
import { BreakdownRequest, Priority, BreakdownStatus } from '../types';
import { Toaster, toast } from 'react-hot-toast';
import { Plus, X, Check, AlertCircle, Wrench, Clock, User, Tag, MapPin, Activity, FileText, CheckCircle2, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function BreakdownView() {
  const { profile, accessToken } = useAuth();
  const [breakdowns, setBreakdowns] = useState<BreakdownRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<BreakdownRequest | null>(null);

  // Form states
  const [assetName, setAssetName] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [failureDesc, setFailureDesc] = useState('');
  const [area, setArea] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');

  // Resolution/Edit states
  const [assignedTo, setAssignedTo] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [sparesUsed, setSparesUsed] = useState('');
  const [downtimeDuration, setDowntimeDuration] = useState('');
  const [editStatus, setEditStatus] = useState<BreakdownStatus>('Reported');

  useEffect(() => {
    const unsubscribe = RequestService.subscribeToBreakdowns((data) => {
      setBreakdowns(data);
      // Update selected if it was modified
      if (selectedBreakdown) {
        const updated = data.find(b => b.id === selectedBreakdown.id);
        if (updated) setSelectedBreakdown(updated);
      }
    });
    return () => unsubscribe();
  }, [selectedBreakdown]);

  useEffect(() => {
    if (selectedBreakdown) {
      setAssignedTo(selectedBreakdown.assignedTo || '');
      setActionsTaken(selectedBreakdown.actionsTaken || '');
      setRootCause(selectedBreakdown.rootCause || '');
      setSparesUsed(selectedBreakdown.sparesUsed || '');
      setDowntimeDuration(selectedBreakdown.downtimeDuration?.toString() || '0');
      setEditStatus(selectedBreakdown.status);
    }
  }, [selectedBreakdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const res = await RequestService.createBreakdownRequest({
        assetName,
        assetTag,
        failureDesc,
        area,
        priority
      }, profile, accessToken || undefined);

      toast.success(`Work Order ${res?.workOrderNumber} created successfully!`);
      
      // Reset form
      setAssetName('');
      setAssetTag('');
      setFailureDesc('');
      setArea('');
      setPriority('Medium');
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Failed to report breakdown');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBreakdown) return;

    try {
      const updates: Partial<BreakdownRequest> = {
        assignedTo,
        status: editStatus,
        actionsTaken,
        rootCause,
        sparesUsed,
        downtimeDuration: parseFloat(downtimeDuration) || 0,
      };

      if (editStatus === 'Resolved' || editStatus === 'Closed') {
        updates.resolvedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }

      await RequestService.updateBreakdownRequest(selectedBreakdown.id, updates);
      toast.success('Work Order updated successfully!');
    } catch (err) {
      toast.error('Failed to update Work Order');
    }
  };

  const filtered = breakdowns.filter(b => {
    const matchesSearch = b.assetName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.failureDesc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const activeCount = breakdowns.filter(b => b.status === 'Reported' || b.status === 'In Progress').length;
  const criticalCount = breakdowns.filter(b => (b.status === 'Reported' || b.status === 'In Progress') && b.priority === 'Critical').length;
  const resolvedCount = breakdowns.filter(b => b.status === 'Resolved' || b.status === 'Closed').length;
  
  const resolvedWithDowntime = breakdowns.filter(b => (b.status === 'Resolved' || b.status === 'Closed') && b.downtimeDuration);
  const totalDowntime = resolvedWithDowntime.reduce((acc, b) => acc + (b.downtimeDuration || 0), 0);
  const avgDowntime = resolvedWithDowntime.length > 0 ? (totalDowntime / resolvedWithDowntime.length).toFixed(1) : '0';

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'Critical': return 'text-[#ef476f] bg-[#ef476f]/10 border-[#ef476f]/20';
      case 'High': return 'text-[#ff9f1c] bg-[#ff9f1c]/10 border-[#ff9f1c]/20';
      case 'Medium': return 'text-[#2d9cff] bg-[#2d9cff]/10 border-[#2d9cff]/20';
      case 'Low': return 'text-[#06d6a0] bg-[#06d6a0]/10 border-[#06d6a0]/20';
    }
  };

  const getStatusColor = (s: BreakdownStatus) => {
    switch (s) {
      case 'Reported': return 'text-[#ef476f] bg-[#ef476f]/10 border-[#ef476f]/20';
      case 'In Progress': return 'text-[#ff9f1c] bg-[#ff9f1c]/10 border-[#ff9f1c]/20';
      case 'Resolved': return 'text-[#06d6a0] bg-[#06d6a0]/10 border-[#06d6a0]/20';
      case 'Closed': return 'text-[#7a95b0] bg-[#7a95b0]/10 border-[#7a95b0]/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Breakdowns', value: activeCount, color: '#ff9f1c', desc: 'Awaiting completion', icon: AlertCircle },
          { label: 'Critical Failures', value: criticalCount, color: '#ef476f', desc: 'Immediate action needed', icon: Activity },
          { label: 'Resolved (WO)', value: resolvedCount, color: '#06d6a0', desc: 'Resolved breakdown issues', icon: CheckCircle2 },
          { label: 'Avg Downtime', value: `${avgDowntime}h`, color: '#00e5c3', desc: 'Per resolved request', icon: Clock },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-[#0f1520] border border-[#1f2d40] p-6 rounded-2xl relative overflow-hidden group hover:border-[#2d9cff]/30 transition-all">
            <div className="text-[#3d5570] text-[10px] uppercase font-bold tracking-widest mb-2">{kpi.label}</div>
            <div className="text-4xl font-bold font-sans" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[#7a95b0] text-xs mt-1">{kpi.desc}</div>
            <kpi.icon className="absolute bottom-4 right-4 w-12 h-12 opacity-5 group-hover:opacity-10 transition-all" />
            <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: kpi.color }} />
          </div>
        ))}
      </div>

      {/* Main Content Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - List and Filters */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-6 space-y-4">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-bold text-[#dde6f0] flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#00e5c3]" /> BREAKDOWN REGISTRY
              </h3>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#ef476f] text-white hover:bg-[#ef476f]/90 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#ef476f]/20"
              >
                <Plus className="w-4 h-4" /> REPORT BREAKDOWN
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3d5570]" />
                <input 
                  type="text"
                  placeholder="Search work orders, equipment tags, assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-[#00e5c3] outline-none transition-all placeholder-[#3d5570]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#3d5570] text-[10px] uppercase font-bold tracking-wider">Status:</span>
                <div className="flex bg-[#141c28] border border-[#1f2d40] rounded-xl p-1 gap-1">
                  {['All', 'Reported', 'In Progress', 'Resolved', 'Closed'].map((s) => (
                    <button 
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                        statusFilter === s 
                          ? "bg-[#00e5c3] text-[#07090d]" 
                          : "text-[#7a95b0] hover:text-[#dde6f0]"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-[#1f2d40] rounded-2xl">
                  <Activity className="w-12 h-12 text-[#3d5570] mx-auto mb-3 opacity-20" />
                  <p className="text-[#7a95b0] text-sm">No breakdown tickets found matching your filter</p>
                </div>
              ) : (
                filtered.map((b) => (
                  <div 
                    key={b.id}
                    onClick={() => setSelectedBreakdown(b)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4",
                      selectedBreakdown?.id === b.id 
                        ? "bg-[#00e5c3]/5 border-[#00e5c3]/30 shadow-md"
                        : "bg-[#141c28]/40 border-[#1f2d40] hover:border-[#2d9cff]/30 hover:bg-[#141c28]/80 text-[#dde6f0]"
                    )}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#00e5c3] text-sm font-bold">{b.workOrderNumber}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                          getPriorityColor(b.priority)
                        )}>
                          {b.priority}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                          getStatusColor(b.status)
                        )}>
                          {b.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#dde6f0]">{b.assetName} ({b.assetTag})</h4>
                      <p className="text-xs text-[#7a95b0] line-clamp-1">{b.failureDesc}</p>
                      
                      <div className="flex items-center gap-4 text-[10px] text-[#3d5570] uppercase font-semibold pt-1">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.area}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> Reported by {b.reportedByName}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.reportedAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-[#1f2d40]">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-[#7a95b0]">Assigned to:</div>
                        <div className="text-xs font-bold text-[#2d9cff] uppercase">{b.assignedTo || 'Unassigned'}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Work Order Details Panel */}
        <div className="lg:col-span-1">
          {selectedBreakdown ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-6 space-y-6 sticky top-6"
            >
              <div className="flex justify-between items-start border-b border-[#1f2d40] pb-4">
                <div>
                  <div className="text-[10px] font-mono font-bold text-[#00e5c3]">{selectedBreakdown.workOrderNumber}</div>
                  <h3 className="text-md font-bold text-[#dde6f0]">Work Order Card</h3>
                </div>
                <button 
                  onClick={() => setSelectedBreakdown(null)}
                  className="text-[#7a95b0] hover:text-[#dde6f0] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#141c28] border border-[#1f2d40] rounded-xl text-center">
                  <div className="text-[9px] uppercase font-bold text-[#3d5570] mb-0.5">PRIORITY</div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase inline-block border",
                    getPriorityColor(selectedBreakdown.priority)
                  )}>
                    {selectedBreakdown.priority}
                  </span>
                </div>
                <div className="p-3 bg-[#141c28] border border-[#1f2d40] rounded-xl text-center">
                  <div className="text-[9px] uppercase font-bold text-[#3d5570] mb-0.5">STATUS</div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase inline-block border",
                    getStatusColor(selectedBreakdown.status)
                  )}>
                    {selectedBreakdown.status}
                  </span>
                </div>
              </div>

              {/* Asset & Breakdown Info */}
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#3d5570]">Asset Tag & Name</div>
                  <div className="font-bold text-[#dde6f0] mt-0.5">{selectedBreakdown.assetTag} - {selectedBreakdown.assetName}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#3d5570]">Location / Area</div>
                  <div className="text-[#dde6f0] flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5 text-[#2d9cff]" /> {selectedBreakdown.area}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#3d5570]">Failure Symptoms</div>
                  <div className="text-xs bg-[#141c28] border border-[#1f2d40] p-3 rounded-xl text-[#7a95b0] mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedBreakdown.failureDesc}
                  </div>
                </div>
              </div>

              {/* Technical Information / Resolution Controls */}
              {profile?.role === 'admin' || profile?.role === 'approver' ? (
                <form onSubmit={handleUpdate} className="border-t border-[#1f2d40] pt-4 space-y-4">
                  <div className="text-xs font-bold text-[#00e5c3] uppercase tracking-wide">Maintenance Actions</div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Update Status</label>
                    <select 
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as BreakdownStatus)}
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-3  py-1.5 text-xs focus:border-[#00e5c3] outline-none"
                    >
                      <option value="Reported">Reported</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed / Verified</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Assign Technician</label>
                    <input 
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      placeholder="e.g. Purandhar Patil, etc."
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-3 py-1.5 text-xs focus:border-[#00e5c3] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Downtime (Hrs)</label>
                      <input 
                        type="number"
                        step="0.5"
                        value={downtimeDuration}
                        onChange={(e) => setDowntimeDuration(e.target.value)}
                        placeholder="0"
                        className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-3 py-1.5 text-xs focus:border-[#00e5c3] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Spares Used</label>
                      <input 
                        value={sparesUsed}
                        onChange={(e) => setSparesUsed(e.target.value)}
                        placeholder="e.g. 5A Fuse, Coupling"
                        className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-3 py-1.5 text-xs focus:border-[#00e5c3] outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Root Cause analysis</label>
                    <input 
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      placeholder="e.g. Bearing over-heating due to dry run"
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-3 py-1.5 text-xs focus:border-[#00e5c3] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Actions Taken Details</label>
                    <textarea 
                      value={actionsTaken}
                      onChange={(e) => setActionsTaken(e.target.value)}
                      rows={2}
                      placeholder="Detailed actions taken..."
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-3 py-1.5 text-xs focus:border-[#00e5c3] outline-none resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#00e5c3] text-[#07090d] py-2.5 rounded-xl text-xs font-bold hover:bg-[#00c9ab] transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <Check className="w-3.5 h-3.5" /> SAVE WORK ORDER CHANGES
                  </button>
                </form>
              ) : (
                // Non-maintenance read-only display
                <div className="border-t border-[#1f2d40] pt-4 space-y-4 text-xs font-medium">
                  <div className="text-xs font-bold text-[#2d9cff] uppercase tracking-wide">Work Order Results</div>
                  <div>
                    <span className="text-[#3d5570] block uppercase tracking-widest">Assigned Technician:</span>
                    <span className="text-[#dde6f0] mt-0.5 inline-block font-bold uppercase">{selectedBreakdown.assignedTo || 'Unassigned'}</span>
                  </div>
                  {selectedBreakdown.downtimeDuration ? (
                    <div>
                      <span className="text-[#3d5570] block uppercase tracking-widest">Actual Downtime:</span>
                      <span className="text-yellow-400 mt-0.5 inline-block font-bold">{selectedBreakdown.downtimeDuration} hours</span>
                    </div>
                  ) : null}
                  {selectedBreakdown.sparesUsed ? (
                    <div>
                      <span className="text-[#3d5570] block uppercase tracking-widest">Spares Replaced:</span>
                      <span className="text-pink-400 mt-0.5 inline-block">{selectedBreakdown.sparesUsed}</span>
                    </div>
                  ) : null}
                  {selectedBreakdown.rootCause ? (
                    <div>
                      <span className="text-[#3d5570] block uppercase tracking-widest">Root Cause:</span>
                      <p className="text-[#7a95b0] mt-0.5 whitespace-pre-wrap">{selectedBreakdown.rootCause}</p>
                    </div>
                  ) : null}
                  {selectedBreakdown.actionsTaken ? (
                    <div>
                      <span className="text-[#3d5570] block uppercase tracking-widest">Actions Taken:</span>
                      <p className="text-[#7a95b0] mt-0.5 whitespace-pre-wrap">{selectedBreakdown.actionsTaken}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center text-sm py-16 text-[#3d5570]">
              <FileText className="w-12 h-12 text-[#3d5570] mx-auto mb-3 opacity-15" />
              <p>Select a breakdown request to view details or update work order card.</p>
            </div>
          )}
        </div>

      </div>

      {/* Report Breakdown Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-[#1f2d40] flex justify-between items-center bg-[#141c28]">
                <h3 className="text-lg font-bold text-[#dde6f0] flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#ef476f]" /> REPORT FAILURE / BREAKDOWN
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-[#7a95b0] hover:text-[#dde6f0]"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Asset / Equipment Name</label>
                    <input 
                      required
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      placeholder="e.g. Water Pump 2A"
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all placeholder-[#3d5570]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Asset Tag ID</label>
                    <input 
                      required
                      value={assetTag}
                      onChange={(e) => setAssetTag(e.target.value)}
                      placeholder="e.g. WP-02A"
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all placeholder-[#3d5570]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Plant Location Room / Area</label>
                    <input 
                      required
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Section B - Utilities"
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all placeholder-[#3d5570]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Severity / Priority</label>
                    <select 
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all text-[#dde6f0]"
                    >
                      <option value="Low">Low (No process stop)</option>
                      <option value="Medium">Medium (Partial disruption)</option>
                      <option value="High">High (Line stoppage)</option>
                      <option value="Critical">Critical (Whole plant down)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Description of failure (Symptoms/Issues)</label>
                  <textarea 
                    required
                    value={failureDesc}
                    onChange={(e) => setFailureDesc(e.target.value)}
                    rows={4}
                    className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all resize-none placeholder-[#3d5570]"
                    placeholder="Provide specific details of the fault. If there are smoke emissions, noise, or pressure drops, describe it here..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 px-4 py-2 rounded-xl border border-[#1f2d40] text-sm font-bold text-[#7a95b0] hover:bg-[#141c28] transition-all"
                  >
                    CANCEL
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-[#ef476f] text-white px-4 py-2 rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-[#ef476f]/10"
                  >
                    SUBMIT BREAKDOWN TICKET
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
