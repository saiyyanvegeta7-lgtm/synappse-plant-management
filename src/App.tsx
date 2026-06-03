import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { RequestService } from './lib/RequestService';
import { Request, RequestStatus, Priority, UserProfile } from './types';
import { Toaster, toast } from 'react-hot-toast';
import { LogIn, Factory, ShieldCheck, ClipboardList, Settings, LogOut, User, Users, LayoutDashboard, Wrench, Package, Lightbulb, GraduationCap, BarChart3, BrainCircuit, Plus, X, Check, AlertCircle, Activity, MessageSquare, Database, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import DatabaseHub from './components/DatabaseHub';
import UserManagementView from './components/UserManagementView';

// --- Components ---

function LoginScreen() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-[#07090d] flex items-center justify-center p-4 font-sans text-[#dde6f0]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-8 w-full max-w-md shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="text-[#00e5c3] text-4xl font-bold tracking-widest mb-2 flex items-center justify-center gap-2">
            <BrainCircuit className="w-10 h-10" /> SYNAPSE
          </div>
          <p className="text-[#7a95b0] text-sm uppercase tracking-widest">Plant Management System</p>
        </div>

        <button 
          onClick={login}
          className="w-full bg-[#00e5c3] hover:bg-[#00c9ab] text-[#07090d] font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#00e5c3]/20 active:scale-95"
        >
          <LogIn className="w-5 h-5" />
          SIGN IN WITH GOOGLE
        </button>

        <div className="mt-8 text-center text-[#3d5570] text-xs">
          Access is restricted to authorized personnel only.
        </div>
      </motion.div>
    </div>
  );
}

function PMView() {
  return (
    <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-8 text-center">
      <Wrench className="w-12 h-12 text-[#3d5570] mx-auto mb-4 opacity-20" />
      <h3 className="text-lg font-bold text-[#dde6f0]">Preventive Maintenance</h3>
      <p className="text-[#7a95b0] mt-2">Maintenance scheduling and tracking module</p>
    </div>
  );
}

function InventoryView() {
  return (
    <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-8 text-center">
      <Package className="w-12 h-12 text-[#3d5570] mx-auto mb-4 opacity-20" />
      <h3 className="text-lg font-bold text-[#dde6f0]">Spares Inventory</h3>
      <p className="text-[#7a95b0] mt-2">Real-time stock monitoring and reorder alerts</p>
    </div>
  );
}

function SolutionsView() {
  return (
    <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-8 text-center">
      <Lightbulb className="w-12 h-12 text-[#3d5570] mx-auto mb-4 opacity-20" />
      <h3 className="text-lg font-bold text-[#dde6f0]">Knowledge Base</h3>
      <p className="text-[#7a95b0] mt-2">Troubleshooting guides and verified solutions</p>
    </div>
  );
}

function TrainingView() {
  return (
    <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-8 text-center">
      <GraduationCap className="w-12 h-12 text-[#3d5570] mx-auto mb-4 opacity-20" />
      <h3 className="text-lg font-bold text-[#dde6f0]">Training & Certs</h3>
      <p className="text-[#7a95b0] mt-2">Staff certification matrix and training schedule</p>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-8 text-center">
      <BarChart3 className="w-12 h-12 text-[#3d5570] mx-auto mb-4 opacity-20" />
      <h3 className="text-lg font-bold text-[#dde6f0]">Operations Analytics</h3>
      <p className="text-[#7a95b0] mt-2">KPI trends and performance metrics</p>
    </div>
  );
}

function NewRequestModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { profile, accessToken } = useAuth();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Spares Purchase');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [cost, setCost] = useState('');
  const [desc, setDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [l1Emails, setL1Emails] = useState<string[]>([]);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    id: string;
    title: string;
    type: string;
    priority: Priority;
    cost: number;
    desc: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load Level 1 approver emails
      RequestService.getApproverEmailsForLevel(1).then(emails => {
        setL1Emails(emails);
      }).catch(console.error);

      // Load settings to see if Webhook is configured
      RequestService.getSettings().then(settings => {
        setWebhookUrl(settings.plant_ops_workflow_web_app_url || null);
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReset = () => {
    setTitle('');
    setType('Spares Purchase');
    setPriority('Medium');
    setCost('');
    setDesc('');
    setSubmittedData(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmitting(true);

    try {
      const parsedCost = parseFloat(cost) || 0;
      const newId = await RequestService.createRequest({
        title,
        type,
        priority,
        cost: parsedCost,
        desc,
        dept: profile.dept,
      }, profile, accessToken || undefined);
      
      setSubmittedData({
        id: newId || 'N/A',
        title,
        type,
        priority,
        cost: parsedCost,
        desc
      });
      toast.success('Workflow request registered successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compile mailto link for direct secure client dispatch
  const mailtoSubject = `[Synapse Action Required] Review Request: ${title || (submittedData && submittedData.title)} (${priority || (submittedData && submittedData.priority)} Priority)`;
  const activeOrigin = window.location.origin;
  const sampleEmailBody = `Dear Plant Engineer / Level 1 Reviewer,

A new plant operations & maintenance request has been raised on the Synapse Plant Management System and is awaiting your immediate review at Level 1 (Plant Engineer).

=======================================================
REQUISITION METADATA
=======================================================
• Request ID: #${submittedData?.id || 'NEW'}
• Request Title: ${submittedData?.title || title}
• Category: ${submittedData?.type || type}
• Priority Level: ${submittedData?.priority || priority}
• Estimated Budget: ₹${(submittedData?.cost || parseFloat(cost) || 0).toLocaleString('en-IN')}
• Logged By: ${profile?.name} (${profile?.email})
• Date Initiated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}

=======================================================
DETAILED JUSTIFICATION & REMARKS
=======================================================
${submittedData?.desc || desc}

=======================================================
HOW TO REVIEW & DECIDE
=======================================================
Please click the link below to access the Synapse Portal, sign in as Level 1 Approver, navigate to "My Approvals", and submit your review:

👉 Access Synapse System: ${activeOrigin}

Thank you,
Synapse Operations Notification Hub
`;

  const finalL1Emails = l1Emails.length > 0 ? l1Emails : ['purandhar@patilgroup.com'];
  const mailtoUrl = `mailto:${finalL1Emails.join(',')}?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(sampleEmailBody)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0f1520] border border-[#1f2d40] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative"
      >
        {!submittedData ? (
          <>
            <div className="p-6 border-b border-[#1f2d40] flex justify-between items-center bg-[#141c28]">
              <h3 className="text-lg font-bold text-[#dde6f0] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#00e5c3]" /> RAISE NEW REQUEST
              </h3>
              <button onClick={handleReset} className="text-[#7a95b0] hover:text-[#dde6f0]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Title</label>
                <input 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2.5 text-sm focus:border-[#00e5c3] outline-none transition-all placeholder-[#3d5570]"
                  placeholder="e.g. Replacement of CT-02 Fan Motor"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Type</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2.5 text-sm focus:border-[#00e5c3] outline-none transition-all"
                  >
                    <option>Spares Purchase</option>
                    <option>Equipment Purchase</option>
                    <option>Maintenance Request</option>
                    <option>Design Approval</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Priority</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2.5 text-sm focus:border-[#00e5c3] outline-none transition-all"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Estimated Cost (₹)</label>
                <input 
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2.5 text-sm focus:border-[#00e5c3] outline-none transition-all placeholder-[#3d5570]"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Description</label>
                <textarea 
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#141c28] border border-[#1f2d40] rounded-xl px-4 py-2.5 text-sm focus:border-[#00e5c3] outline-none transition-all resize-none placeholder-[#3d5570]"
                  placeholder="Provide justification and engineering details..."
                />
              </div>
              <div className="bg-[#141c28]/60 border border-[#1f2d40]/80 p-4 rounded-xl space-y-2">
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#3d5570] block">Mandatory Approval Routing Chain</span>
                <div className="flex items-center justify-between gap-1 text-[10px] text-[#7a95b0] font-sans">
                  <div className="flex flex-col items-center flex-1 bg-[#1a2536]/40 border border-[#1f2d40]/55 p-1.5 rounded-lg text-center">
                    <span className="text-[#00e5c3] font-bold">1. Plant Eng.</span>
                    <span className="text-[8px] text-[#3d5570] uppercase">Verification</span>
                  </div>
                  <div className="text-[#3d5570] font-bold">➔</div>
                  <div className="flex flex-col items-center flex-1 bg-[#1a2536]/40 border border-[#1f2d40]/55 p-1.5 rounded-lg text-center">
                    <span className="text-[#2d9cff] font-bold">2. Head Office</span>
                    <span className="text-[8px] text-[#3d5570] uppercase">HO Engg.</span>
                  </div>
                  <div className="text-[#3d5570] font-bold">➔</div>
                  <div className="flex flex-col items-center flex-1 bg-[#1a2536]/40 border border-[#1f2d40]/55 p-1.5 rounded-lg text-center">
                    <span className="text-[#ff9f1c] font-bold">3. Plant Head</span>
                    <span className="text-[8px] text-[#3d5570] uppercase">Final OK</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={handleReset} 
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 rounded-xl border border-[#1f2d40] text-sm font-bold text-[#7a95b0] hover:bg-[#141c28] transition-all disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-[#00e5c3] text-[#07090d] px-4 py-3 rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#07090d]/30 border-t-[#07090d] rounded-full animate-spin" />
                      SUBMITTING...
                    </>
                  ) : 'SUBMIT REQUEST'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#06d6a0]/15 text-[#06d6a0] flex items-center justify-center mx-auto border border-[#06d6a0]/30 shadow-inner">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#dde6f0] mt-2">Request Successfully Logged</h3>
              <p className="text-xs text-[#7a95b0] mt-1 max-w-sm mx-auto">
                Request <span className="font-mono text-[#00e5c3] font-bold">#{submittedData.id.substring(0, 8)}</span> is active in the database and awaiting review.
              </p>
            </div>

            {/* Approvers List Details */}
            <div className="bg-[#141c28]/60 border border-[#1f2d40] rounded-xl p-4 text-left space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#3d5570]">Active Destination Segment</div>
              <div className="flex items-center gap-3 bg-[#07090d]/60 border border-[#1f2d40]/40 rounded-lg p-2.5">
                <div className="w-6 h-6 rounded bg-[#ff9f1c]/10 text-[#ff9f1c] flex items-center justify-center text-xs font-bold font-mono">L1</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#dde6f0]">Level 1 - Plant Engineer</div>
                  <div className="text-[10px] text-[#7a95b0] truncate">{finalL1Emails.join(', ')}</div>
                </div>
              </div>
              <p className="text-[11px] text-[#5a6e85] leading-relaxed">
                🔔 First stage personnel must approve the engineering specifications before this request advances to the head office review stage.
              </p>
            </div>

            {/* Email triggers */}
            <div className="space-y-4">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#3d5570] block">Deliver Alert Immediately</span>

              {accessToken ? (
                <div className="bg-[#06d6a0]/10 border border-[#06d6a0]/30 rounded-xl p-4 text-left font-sans space-y-2">
                  <div className="flex justify-between items-center text-[10px] tracking-wider uppercase font-bold">
                    <span className="text-[#7a95b0]">Background Gmail Delivery</span>
                    <span className="text-[#06d6a0] flex items-center gap-1">⚡ Sent Automatically</span>
                  </div>
                  <p className="text-xs text-[#dde6f0] leading-relaxed font-medium">
                    The Synapse Operating Engine used your verified Google Account to automatically dispatch the notification email to L1 Reviewers: <span className="text-[#00e5c3] font-mono">{finalL1Emails.join(', ')}</span> without requiring manual actions!
                  </p>
                  <div className="text-[10px] text-[#7a95b0] italic">
                    ✓ Verified via Google OAuth API System Scopes
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-[#ff9f1c]/10 border border-[#ff9f1c]/30 rounded-xl p-4 text-left font-sans space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] tracking-wider uppercase font-bold">
                      <span className="text-[#7a95b0]">Direct Delivery Warning</span>
                      <span className="text-[#ff9f1c] flex items-center gap-1">👤 Auth Required</span>
                    </div>
                    <p className="text-xs text-[#7a95b0] leading-relaxed">
                      You are logged in via Firebase, but your Google Workspace/Gmail API access hasn't been authorized yet. 
                      Click below to trigger a standard email dispatch, or authorize "Google Sheets & Gmail" in the Database Hub for fully silent background delivery.
                    </p>
                  </div>

                  <a 
                    href={mailtoUrl}
                    onClick={() => toast.success('Launching system mail app...')}
                    className="w-full py-3.5 bg-[#00e5c3] hover:bg-[#00c9ab] text-[#07090d] font-bold rounded-xl text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#00e5c3]/15 transition-all text-center"
                  >
                    <Mail className="w-5 h-5" />
                    DISPATCH ACTUAL EMAIL NOW
                  </a>
                </div>
              )}
              
              {webhookUrl && (
                <div className="text-left bg-[#07090d]/50 border border-[#1f2d40] rounded-xl p-3.5 font-sans space-y-1 font-medium">
                  <div className="flex justify-between items-center text-[10px] tracking-wider uppercase font-bold">
                    <span className="text-[#7a95b0]">Secondary Webhook Service</span>
                    <span className="text-[#06d6a0] flex items-center gap-1">🟢 Sent</span>
                  </div>
                  <p className="text-[11px] text-[#5a6e85] leading-relaxed">
                    The Google Apps Script deployment webhook was also updated instantly in your connected master spreadsheet!
                  </p>
                </div>
              )}
            </div>

            {/* Close */}
            <div className="pt-2">
              <button 
                type="button" 
                onClick={handleReset}
                className="w-full py-2.5 bg-transparent hover:bg-[#1f2d40]/30 border border-[#1f2d40] text-xs font-bold text-[#7a95b0] hover:text-[#dde6f0] rounded-xl uppercase tracking-wider transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function MainApp() {
  const [activeView, setActiveView] = useState('dashboard');
  const [requests, setRequests] = useState<Request[]>([]);
  const [isNewReqOpen, setIsNewReqOpen] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    const unsubscribe = RequestService.subscribeToRequests(setRequests);
    return () => unsubscribe();
  }, []);

  const pendingForMe = requests.filter(r => {
    if (r.status === 'approved' || r.status === 'rejected') return false;
    const activeStep = r.approvalSteps.find(s => s.status === 'active');
    if (!activeStep) return false;
    
    // Simple logic: if admin, can approve anything. If approver, check level.
    if (profile?.role === 'admin' || profile?.email === 'purandhar@patilgroup.com') return true;
    if (profile?.role === 'approver' && profile.approvalLevel === activeStep.level) return true;
    return false;
  });

  return (
    <div className="flex min-h-screen bg-[#07090d] text-[#dde6f0]">
      <Sidebar activeView={activeView} setActiveView={setActiveView} pendingCount={pendingForMe.length} />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase font-sans text-[#dde6f0]">
              {activeView.replace('-', ' ')}
            </h1>
            <p className="text-[#7a95b0] text-sm mt-1">Real-time plant operations monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#06d6a0]/10 border border-[#06d6a0]/20 text-[#06d6a0] text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#06d6a0] animate-pulse" />
              Live · Hyderabad Plant #2
            </div>
            <button 
              onClick={() => setIsNewReqOpen(true)}
              className="bg-[#00e5c3] text-[#07090d] px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-[#00e5c3]/10"
            >
              <Plus className="w-4 h-4" /> NEW REQUEST
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeView === 'dashboard' && <DashboardView requests={requests} />}
            {activeView === 'requests' && <RequestsView requests={requests} />}
            {activeView === 'pending' && <PendingView requests={pendingForMe} />}
            {activeView === 'databases' && <DatabaseHub />}
            {activeView === 'users' && <UserManagementView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <NewRequestModal isOpen={isNewReqOpen} onClose={() => setIsNewReqOpen(false)} />
    </div>
  );
}

function Sidebar({ activeView, setActiveView, pendingCount }: { activeView: string, setActiveView: (v: string) => void, pendingCount: number }) {
  const { profile, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'All Requests', icon: ClipboardList },
    { id: 'pending', label: 'My Approvals', icon: ShieldCheck, badge: pendingCount },
    { id: 'databases', label: 'Database Hub', icon: Database },
    ...(profile?.role === 'admin' || profile?.email === 'purandhar@patilgroup.com' ? [{ id: 'users', label: 'Manage Team', icon: Users, badge: 0 }] : []),
  ];

  return (
    <aside className="w-64 bg-[#0f1520] border-r border-[#1f2d40] flex flex-col h-screen sticky top-0 overflow-hidden">
      <div className="p-6 border-b border-[#1f2d40]">
        <div className="text-[#00e5c3] text-2xl font-bold tracking-widest flex items-center gap-2">
          <BrainCircuit className="w-6 h-6" /> SYNAPSE
        </div>
        <div className="text-[#3d5570] text-[10px] uppercase tracking-widest mt-1">Plant Operating System</div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium relative",
              activeView === item.id 
                ? "bg-[#00e5c3]/10 text-[#00e5c3] border border-[#00e5c3]/20" 
                : "text-[#7a95b0] hover:bg-[#141c28] hover:text-[#dde6f0]"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
            {item.badge > 0 && (
              <span className="absolute right-4 bg-[#ef476f] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-[#1f2d40] space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#141c28] border border-[#1f2d40]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00e5c3] to-[#2d9cff] flex items-center justify-center text-[#07090d] font-bold text-xs">
            {profile?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[#dde6f0] text-xs font-bold truncate">{profile?.name}</div>
            <div className={cn(
              "text-[10px] uppercase truncate font-bold",
              profile?.role === 'admin' ? "text-[#ef476f]" : 
              profile?.role === 'approver' ? "text-[#ff9f1c]" : "text-[#2d9cff]"
            )}>
              {profile?.role}
            </div>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#ef476f] hover:bg-[#ef476f]/10 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// --- Views ---

function DashboardView({ requests }: { requests: Request[] }) {
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'review').length;
  const rate = requests.length > 0 ? Math.round((approvedCount / requests.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: requests.length, color: '#00e5c3', icon: ClipboardList },
          { label: 'Pending', value: pendingCount, color: '#ff9f1c', icon: AlertCircle },
          { label: 'Inventory Alerts', value: '12', color: '#ef476f', icon: Package },
          { label: 'Approval Rate', value: `${rate}%`, color: '#06d6a0', icon: ShieldCheck },
        ].map((kpi, i) => (
          <div key={i} className="bg-[#0f1520] border border-[#1f2d40] p-6 rounded-2xl relative overflow-hidden group hover:border-[#2d9cff]/30 transition-all">
            <div className="text-[#3d5570] text-[10px] uppercase font-bold tracking-widest mb-4">{kpi.label}</div>
            <div className="text-4xl font-bold font-sans" style={{ color: kpi.color }}>{kpi.value}</div>
            <kpi.icon className="absolute bottom-4 right-4 w-12 h-12 opacity-5 group-hover:opacity-10 transition-all" />
            <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: kpi.color }} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#7a95b0] mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {requests.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#141c28] transition-all border border-transparent hover:border-[#1f2d40]">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                  r.status === 'approved' ? "bg-[#06d6a0]/10 text-[#06d6a0]" : "bg-[#ff9f1c]/10 text-[#ff9f1c]"
                )}>
                  {r.status === 'approved' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#dde6f0] truncate">{r.title}</div>
                  <div className="text-[10px] text-[#3d5570] uppercase tracking-wider">{r.requesterName} · {r.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-[#00e5c3]">₹{r.cost.toLocaleString()}</div>
                  <div className="text-[10px] text-[#3d5570] uppercase">{r.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#7a95b0] mb-6">Maintenance Schedule</h3>
          <div className="flex items-center justify-center h-48 text-[#3d5570] text-sm">
            No upcoming maintenance tasks
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestsView({ requests }: { requests: Request[] }) {
  return (
    <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-[#1f2d40] flex justify-between items-center bg-[#141c28]">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#7a95b0]">All Approval Requests</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[#3d5570] border-b border-[#1f2d40] bg-[#0b0f17]">
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">ID</th>
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Title</th>
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Type</th>
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Cost</th>
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Status</th>
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2d40]">
            {requests.map((r, i) => (
              <tr key={r.id} className="hover:bg-[#141c28] transition-all cursor-pointer group">
                <td className="px-6 py-4 font-mono text-[#00e5c3]">REQ-{i+1}</td>
                <td className="px-6 py-4">
                  <div className="font-medium text-[#dde6f0]">{r.title}</div>
                  <div className="text-[10px] text-[#3d5570] uppercase">{r.requesterName}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-md bg-[#c77dff]/10 text-[#c77dff] text-[10px] font-bold uppercase">{r.type}</span>
                </td>
                <td className="px-6 py-4 font-bold text-[#00e5c3]">₹{r.cost.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                    r.status === 'approved' ? "bg-[#06d6a0]/10 text-[#06d6a0]" : 
                    r.status === 'rejected' ? "bg-[#ef476f]/10 text-[#ef476f]" : "bg-[#ff9f1c]/10 text-[#ff9f1c]"
                  )}>
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#3d5570]">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PendingView({ requests }: { requests: Request[] }) {
  const { profile, accessToken } = useAuth();
  const [comment, setComment] = useState('');

  const handleAction = async (request: Request, action: 'approve' | 'reject') => {
    if (!profile) return;
    const activeStep = request.approvalSteps.find(s => s.status === 'active');
    if (!activeStep) return;

    try {
      await RequestService.updateApproval(request.id, request, activeStep.level, profile, action, comment, accessToken || undefined);
      toast.success(`Request ${action}d successfully`);
      setComment('');
    } catch (error) {
      toast.error(`Failed to ${action} request`);
    }
  };

  return (
    <div className="space-y-6">
      {requests.length === 0 ? (
        <div className="text-center py-20 bg-[#0f1520] border border-[#1f2d40] rounded-2xl">
          <ShieldCheck className="w-12 h-12 text-[#3d5570] mx-auto mb-4 opacity-20" />
          <p className="text-[#7a95b0]">No requests awaiting your approval</p>
        </div>
      ) : (
        requests.map((r) => (
          <div key={r.id} className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-[#1f2d40] flex justify-between items-center bg-[#141c28]">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#00e5c3] mb-1">Awaiting Approval</div>
                <h3 className="text-lg font-bold text-[#dde6f0]">{r.title}</h3>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-[#00e5c3]">₹{r.cost.toLocaleString()}</div>
                <div className="text-[10px] text-[#3d5570] uppercase">{r.type} · {r.priority}</div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Description</label>
                  <p className="text-sm text-[#7a95b0] mt-1 leading-relaxed">{r.desc}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Requester</label>
                    <div className="text-sm font-bold mt-1">{r.requesterName}</div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570]">Department</label>
                    <div className="text-sm font-bold mt-1">{r.dept}</div>
                  </div>
                </div>
              </div>
              <div className="bg-[#0b0f17] rounded-xl p-4 border border-[#1f2d40]">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570] mb-4 block">Approval Progress</label>
                <div className="space-y-4">
                  {r.approvalSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                        step.status === 'approved' ? "bg-[#06d6a0] text-[#07090d]" :
                        step.status === 'active' ? "bg-[#00e5c3]/20 text-[#00e5c3] border border-[#00e5c3]/40" :
                        "bg-[#1f2d40] text-[#3d5570]"
                      )}>
                        {step.status === 'approved' ? <Check className="w-3 h-3" /> : step.level}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-[#dde6f0]">{step.role}</div>
                        <div className="text-[10px] text-[#3d5570] uppercase">{step.person} · {step.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-[#141c28] border-t border-[#1f2d40] flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[#3d5570] mb-2 block">Your Comments</label>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-[#0f1520] border border-[#1f2d40] rounded-xl px-4 py-2 text-sm focus:border-[#00e5c3] outline-none transition-all resize-none"
                  placeholder="Add approval remarks or rejection reasons..."
                  rows={2}
                />
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={() => handleAction(r, 'reject')}
                  className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-[#ef476f]/30 text-[#ef476f] text-sm font-bold hover:bg-[#ef476f]/10 transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> REJECT
                </button>
                <button 
                  onClick={() => handleAction(r, 'approve')}
                  className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-[#06d6a0] text-[#07090d] text-sm font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> APPROVE
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// --- Root ---

function AppContent() {
  const { user, profile, loading, profileError, retryProfile, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00e5c3]/20 border-t-[#00e5c3] rounded-full animate-spin" />
          <div className="text-[#00e5c3] text-sm font-bold tracking-widest animate-pulse">INITIALIZING SYNAPSE...</div>
        </div>
      </div>
    );
  }

  if (user && profileError && !profile) {
    return (
      <div className="min-h-screen bg-[#07090d] flex items-center justify-center p-4 font-sans text-[#dde6f0]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-8 w-full max-w-md shadow-2xl text-center"
        >
          <div className="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20 mb-6 flex justify-center mx-auto w-14 h-14 items-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connection Issues Detected</h2>
          <p className="text-xs text-[#7a95b0] mb-4">
            We are having trouble connecting to the database server.
          </p>
          <div className="bg-[#141c28] border border-[#1f2d40] p-4 rounded-xl text-left text-xs mb-6 max-h-32 overflow-y-auto">
            <span className="text-[10px] text-[#3d5570] uppercase font-bold tracking-wider block mb-1">Error details</span>
            <code className="text-[#ff9f1c] font-mono break-all leading-relaxed">{profileError}</code>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={retryProfile}
              className="w-full bg-[#00e5c3] hover:brightness-110 text-[#07090d] font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00e5c3]/15 active:scale-95"
            >
              RETRY CONNECTION
            </button>
            <button 
              onClick={logout}
              className="w-full bg-transparent hover:bg-[#141c28] text-[#7a95b0] hover:text-[#dde6f0] border border-[#1f2d40] font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 text-xs tracking-wider"
            >
              <LogOut className="w-4 h-4" /> SIGN OUT
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return user && profile ? <MainApp /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0f1520',
            color: '#dde6f0',
            border: '1px solid #1f2d40',
          },
        }}
      />
    </AuthProvider>
  );
}
