import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { RequestService } from '../lib/RequestService';
import { MessageSquare, Plus, X, Check, Search, Filter, Hash, User, Mail, Tag, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Priority, EnquiryStatus, Enquiry } from '../types';

export default function EnquiryView() {
  const { profile, accessToken } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  // Form states (Create)
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<'Procurement' | 'Maintenance Services' | 'Safety Audit' | 'Spares Supply' | 'General'>('General');
  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');

  // Response/Edit states
  const [assignedTo, setAssignedTo] = useState('');
  const [responseDetails, setResponseDetails] = useState('');
  const [editStatus, setEditStatus] = useState<EnquiryStatus>('Open');

  useEffect(() => {
    const unsubscribe = RequestService.subscribeToEnquiries((data) => {
      setEnquiries(data);
      if (selectedEnquiry) {
        const updated = data.find(e => e.id === selectedEnquiry.id);
        if (updated) setSelectedEnquiry(updated);
      }
    });
    return () => unsubscribe();
  }, [selectedEnquiry]);

  useEffect(() => {
    if (selectedEnquiry) {
      setAssignedTo(selectedEnquiry.assignedTo || '');
      setResponseDetails(selectedEnquiry.responseDetails || '');
      setEditStatus(selectedEnquiry.status);
    }
  }, [selectedEnquiry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const res = await RequestService.createEnquiry({
        subject,
        type,
        senderName,
        senderContact,
        details,
        priority
      }, profile, accessToken || undefined);

      toast.success(`Enquiry ${res?.enquiryNumber} submitted successfully!`);
      
      // Reset form
      setSubject('');
      setType('General');
      setSenderName('');
      setSenderContact('');
      setDetails('');
      setPriority('Medium');
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Failed to submit enquiry');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry) return;

    try {
      await RequestService.updateEnquiry(selectedEnquiry.id, {
        assignedTo,
        status: editStatus,
        responseDetails
      });
      toast.success('Enquiry updated successfully!');
    } catch (err) {
      toast.error('Failed to update enquiry');
    }
  };

  const filtered = enquiries.filter(e => {
    const matchesSearch = e.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.enquiryNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    const matchesType = typeFilter === 'All' || e.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // KPI Calculations
  const totalCount = enquiries.length;
  const openCount = enquiries.filter(e => e.status === 'Open' || e.status === 'Under Review').length;
  const answeredCount = enquiries.filter(e => e.status === 'Answered').length;
  const highPriorityCount = enquiries.filter(e => (e.status === 'Open' || e.status === 'Under Review') && (e.priority === 'Critical' || e.priority === 'High')).length;

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'Critical': return 'text-[#ef476f] bg-[#ef476f]/10 border-[#ef476f]/20';
      case 'High': return 'text-[#ff9f1c] bg-[#ff9f1c]/10 border-[#ff9f1c]/20';
      case 'Medium': return 'text-[#2d9cff] bg-[#2d9cff]/10 border-[#2d9cff]/20';
      case 'Low': return 'text-[#06d6a0] bg-[#06d6a0]/10 border-[#06d6a0]/20';
    }
  };

  const getStatusColor = (s: EnquiryStatus) => {
    switch (s) {
      case 'Open': return 'text-[#ef476f] bg-[#ef476f]/10 border-[#ef476f]/20';
      case 'Under Review': return 'text-[#ff9f1c] bg-[#ff9f1c]/10 border-[#ff9f1c]/20';
      case 'Answered': return 'text-[#06d6a0] bg-[#06d6a0]/10 border-[#06d6a0]/20';
      case 'Closed': return 'text-[#7a95b0] bg-[#7a95b0]/10 border-[#7a95b0]/20';
    }
  };

  return (
    <div id="enquiry-view-root" className="space-y-6">
      <Toaster position="top-right" />
      
      {/* KPI Display */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Enquiries', value: totalCount, color: '#2d9cff', desc: 'All logged enquiries', icon: HelpCircle },
          { label: 'Pending Action', value: openCount, color: '#ff9f1c', desc: 'Open / Under Review', icon: AlertTriangle },
          { label: 'Answered', value: answeredCount, color: '#06d6a0', desc: 'Resolved enquiries', icon: CheckCircle },
          { label: 'Critical / High Priority', value: highPriorityCount, color: '#ef476f', desc: 'Immediate response needed', icon: MessageSquare },
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Enquiries List Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-6 space-y-4">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-bold text-[#dde6f0] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#2d9cff]" /> ENQUIRIES CENTRAL DATABASE
              </h3>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#2d9cff] text-white hover:bg-[#2d9cff]/90 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#2d9cff]/20"
              >
                <Plus className="w-4 h-4" /> LOG NEW ENQUIRY
              </button>
            </div>

            {/* Sub-Filters Pane */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3d5570]" />
                <input 
                  type="text"
                  placeholder="Search subject, enquiry model, sender or details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-[#00e5c3] outline-none transition-all placeholder-[#3d5570]"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[#3d5570] text-[10px] uppercase font-bold tracking-wider">Type:</span>
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-[#141c28] border border-[#1f2d40] rounded-xl px-3 py-2 text-xs focus:border-[#00e5c3] outline-none text-[#dde6f0]"
                >
                  <option value="All">All Types</option>
                  <option value="Procurement">Procurement</option>
                  <option value="Maintenance Services">Maintenance Services</option>
                  <option value="Safety Audit">Safety Audit</option>
                  <option value="Spares Supply">Spares Supply</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[#3d5570] text-[10px] uppercase font-bold tracking-wider">Status:</span>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#141c28] border border-[#1f2d40] rounded-xl px-3 py-2 text-xs focus:border-[#00e5c3] outline-none text-[#dde6f0]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Answered">Answered</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Enquiries List */}
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-[#1f2d40] rounded-2xl">
                  <MessageSquare className="w-12 h-12 text-[#3d5570] mx-auto mb-3 opacity-20" />
                  <p className="text-[#7a95b0] text-sm">No enquiries found matching your query</p>
                </div>
              ) : (
                filtered.map((e) => (
                  <div 
                    key={e.id}
                    onClick={() => setSelectedEnquiry(e)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4",
                      selectedEnquiry?.id === e.id 
                        ? "bg-[#2d9cff]/5 border-[#2d9cff]/30 shadow-md"
                        : "bg-[#141c28]/40 border-[#1f2d40] hover:border-[#2d9cff]/30 hover:bg-[#141c28]/80 text-[#dde6f0]"
                    )}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#2d9cff] text-xs font-bold flex items-center gap-1">
                          <Hash className="w-3 h-3" /> {e.enquiryNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border border-[#1f2d40] bg-[#141c28] text-[#7a95b0]">
                          {e.type}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                          getPriorityColor(e.priority)
                        )}>
                          {e.priority}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                          getStatusColor(e.status)
                        )}>
                          {e.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#dde6f0]">{e.subject}</h4>
                      <p className="text-xs text-[#7a95b0] line-clamp-1">{e.details}</p>
                      
                      <div className="flex items-center gap-4 text-[10px] text-[#3d5570] uppercase font-semibold pt-1">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {e.senderName} ({e.senderContact})</span>
                        <span className="flex items-center gap-1">Logged by {e.submittedByName}</span>
                        <span>{e.submittedAt}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-[#1f2d40]">
                      <div className="text-[10px] font-semibold text-[#3d5570] uppercase">Assigned Staff</div>
                      <div className="text-xs font-bold text-[#dde6f0]">{e.assignedTo || 'Unassigned'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

        {/* Selected Inquiry Detail/Update Panel */}
        <div className="lg:col-span-1">
          {selectedEnquiry ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-6 space-y-6 sticky top-6"
            >
              <div className="flex justify-between items-start border-b border-[#1f2d40] pb-4">
                <div>
                  <div className="text-[10px] font-mono font-bold text-[#2d9cff] flex items-center gap-1">
                    <Hash className="w-3 h-3" /> {selectedEnquiry.enquiryNumber}
                  </div>
                  <h3 className="text-md font-bold text-[#dde6f0]">Enquiry Registry Card</h3>
                </div>
                <button 
                  onClick={() => setSelectedEnquiry(null)}
                  className="text-[#7a95b0] hover:text-[#dde6f0] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Header */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#141c28] border border-[#1f2d40] rounded-xl text-center">
                  <div className="text-[9px] uppercase font-bold text-[#3d5570] mb-0.5">TYPE</div>
                  <span className="text-xs font-bold text-[#2d9cff]">{selectedEnquiry.type}</span>
                </div>
                <div className="p-3 bg-[#141c28] border border-[#1f2d40] rounded-xl text-center">
                  <div className="text-[9px] uppercase font-bold text-[#3d5570] mb-0.5">STATUS</div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase inline-block border",
                    getStatusColor(selectedEnquiry.status)
                  )}>
                    {selectedEnquiry.status}
                  </span>
                </div>
              </div>

              {/* Information */}
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#3d5570]">Subject</div>
                  <div className="font-bold text-[#dde6f0] mt-0.5">{selectedEnquiry.subject}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#3d5570]">Sender details</div>
                  <div className="text-xs text-[#dde6f0] flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-[#2d9cff]" /> {selectedEnquiry.senderName}
                  </div>
                  <div className="text-xs text-[#7a95b0] flex items-center gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-[#3d5570]" /> {selectedEnquiry.senderContact}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#3d5570]">Enquiry details</div>
                  <div className="text-xs bg-[#141c28] border border-[#1f2d40] p-3 rounded-xl text-[#7a95b0] mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedEnquiry.details}
                  </div>
                </div>
              </div>

              {/* CRM / Verification Actions for Authorized Users */}
              {profile?.role === 'admin' || profile?.role === 'approver' ? (
                <form onSubmit={handleUpdate} className="border-t border-[#1f2d40] pt-4 space-y-4">
                  <div className="text-xs font-bold text-[#00e5c3] uppercase tracking-wide">Database Action Panel</div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Assigned Team / Person</label>
                    <input 
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      placeholder="e.g. Purandhar Patil, Sales Lead"
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-3 py-1.5 text-xs focus:border-[#00e5c3] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Enquiry Status</label>
                    <select 
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as EnquiryStatus)}
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-3 py-1.5 text-xs focus:border-[#00e5c3] outline-none text-[#dde6f0]"
                    >
                      <option value="Open">Open</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Answered">Answered / Cleared</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Database response details / Remarks</label>
                    <textarea 
                      value={responseDetails}
                      onChange={(e) => setResponseDetails(e.target.value)}
                      rows={3}
                      placeholder="Enter response sent to the requester or internally resolved comments..."
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-3 py-1.5 text-xs focus:border-[#00e5c3] outline-none resize-none placeholder-[#3d5570] text-[#dde6f0]"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#00e5c3] text-[#07090d] py-2.5 rounded-xl text-xs font-bold hover:bg-[#00c9ab] transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5" /> UPDATE ENQUIRY ENTRY
                  </button>
                </form>
              ) : (
                // Read-only Response Panel
                <div className="border-t border-[#1f2d40] pt-4 space-y-4 text-xs font-medium">
                  <div className="text-xs font-bold text-[#2d9cff] uppercase tracking-wide">database Resolution / Remarks</div>
                  <div>
                    <span className="text-[#3d5570] block uppercase tracking-widest">Assigned Staff:</span>
                    <span className="text-[#dde6f0] mt-0.5 inline-block font-bold">{selectedEnquiry.assignedTo || 'Unassigned'}</span>
                  </div>
                  {selectedEnquiry.responseDetails ? (
                    <div>
                      <span className="text-[#3d5570] block uppercase tracking-widest">Response Sent:</span>
                      <p className="text-[#7a95b0] mt-1 bg-[#141c28] p-3 rounded-xl border border-[#1f2d40] whitespace-pre-wrap leading-relaxed">{selectedEnquiry.responseDetails}</p>
                    </div>
                  ) : (
                    <div className="text-[#3d5570] italic">No active response has been recorded yet.</div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center text-sm py-16 text-[#3d5570]">
              <MessageSquare className="w-12 h-12 text-[#3d5570] mx-auto mb-3 opacity-15" />
              <p>Select an enquiry to view details, verify, or register response remarks.</p>
            </div>
          )}
        </div>

      </div>

      {/* Log Enquiry Modal */}
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
                  <MessageSquare className="w-5 h-5 text-[#2d9cff]" /> REGISTER ENQUIRY IN DATABASE
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-[#7a95b0] hover:text-[#dde6f0]"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Enquiry Subject</label>
                  <input 
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Quotation for Spare Seals, Safety Audit Request..."
                    className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all placeholder-[#3d5570] text-[#dde6f0]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Enquiry Type</label>
                    <select 
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all text-[#dde6f0]"
                    >
                      <option value="General">General Enquiry</option>
                      <option value="Procurement">Procurement</option>
                      <option value="Maintenance Services">Maintenance Services</option>
                      <option value="Safety Audit">Safety Audit</option>
                      <option value="Spares Supply">Spares Supply</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Severity / Priority</label>
                    <select 
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all text-[#dde6f0]"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Sender Name (Vendor / Team)</label>
                    <input 
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. Acme Spares Ltd"
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all placeholder-[#3d5570] text-[#dde6f0]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Sender Contact (Email / Phone)</label>
                    <input 
                      required
                      value={senderContact}
                      onChange={(e) => setSenderContact(e.target.value)}
                      placeholder="e.g. contact@acmespares.com"
                      className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all placeholder-[#3d5570] text-[#dde6f0]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Detailed Enquiry Content</label>
                  <textarea 
                    required
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={4}
                    className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all resize-none placeholder-[#3d5570] text-[#dde6f0]"
                    placeholder="Enter specific questions, quotation requests, or detailed descriptions here..."
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
                    className="flex-1 bg-[#2d9cff] text-white px-4 py-2 rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-[#2d9cff]/10"
                  >
                    SUBMIT TO DATABASE
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
