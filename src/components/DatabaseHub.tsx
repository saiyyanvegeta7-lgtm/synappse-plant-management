import React, { useState, useEffect } from 'react';
import { 
  Database, Wrench, Package, Lightbulb, GraduationCap, BarChart3, 
  Activity, MessageSquare, Cloud, CheckCircle, ExternalLink, 
  FileSpreadsheet, Sparkles, RefreshCw, Unlink, Loader2, AlertCircle,
  Copy, Check, Shield, User, ArrowRight
} from 'lucide-react';
import BreakdownView from './BreakdownView';
import EnquiryView from './EnquiryView';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import { GoogleSheetsService, ConnectedSheetInfo } from '../lib/GoogleSheetsService';
import { RequestService } from '../lib/RequestService';
import { toast } from 'react-hot-toast';
import { SettingsService } from '../lib/SettingsService';

// Subcomponents matching the prior App.tsx placeholders or files
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

function WorkflowSetupView() {
  const [copied, setCopied] = useState(false);
  const { profile, updateProfile } = useAuth();
  const [webAppUrl, setWebAppUrl] = useState('');

  useEffect(() => {
    const unsubscribe = SettingsService.subscribeToGlobalSettings((settings) => {
      if (settings.plant_ops_workflow_web_app_url !== undefined) {
        setWebAppUrl(settings.plant_ops_workflow_web_app_url || '');
      }
    });
    return () => unsubscribe();
  }, []);

  const saveWebAppUrl = async (url: string) => {
    setWebAppUrl(url);
    try {
      await SettingsService.saveGlobalSettings({ plant_ops_workflow_web_app_url: url });
      toast.success('Workflow Web App URL configured & saved globally!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save Web App URL globally');
    }
  };

  const googleAppsScriptCode = `/**
 * Synapse Plant Operations Workflows & Alert Controller
 * Paste this in your Google Sheet under: Extensions -> Apps Script
 *
 * This workflow is dual-triggered and handles:
 * 1. Cell modifications directly inside the spreadsheet (handleSheetEdit)
 * 2. In-app Approvals triggered from the React Web App are forwarded here via Webhooks (doPost)
 */

// 1. CONFIGURE DEFAULT RECIPIENT EMAIL HERE
var DEFAULT_RECIPIENT_EMAIL = "${profile?.email || 'your-email@domain.com'}";

// Installable trigger function for manual spreadsheet edits (Trigger onEdit)
function handleSheetEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  if (sheet.getName() !== "Requests") return;
  
  var row = range.getRow();
  var col = range.getColumn();
  
  // Column J (10) is "Approver Decision"
  if (col === 10 && row > 1) {
    var decision = range.getValue().toString().trim();
    if (!decision) return;
    
    var activeUser = Session.getActiveUser().getEmail() || "Spreadsheet Approver";
    sheet.getRange(row, 12).setValue(new Date().toLocaleString());
    sheet.getRange(row, 13).setValue(activeUser);
    
    var newStatus = "pending";
    if (decision.toLowerCase().indexOf("approve") !== -1 || decision.toLowerCase() === "approved") {
      newStatus = "approved";
      sheet.getRange(row, 7).setValue("approved");
    } else if (decision.toLowerCase().indexOf("reject") !== -1 || decision.toLowerCase() === "rejected") {
      newStatus = "rejected";
      sheet.getRange(row, 7).setValue("rejected");
    }
    
    triggerAlertFromRow(sheet, row, newStatus, decision, activeUser);
  }
}

// Handles in-app approvals sent from the Web App API
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    
    sendWorkflowEmail({
      requestId: payload.requestId,
      subject: payload.subject,
      type: payload.type,
      requesterName: payload.requesterName,
      dateLogged: payload.dateLogged,
      cost: payload.cost,
      status: payload.status,
      decision: payload.decision,
      remarks: payload.remarks,
      feedback: payload.feedback || payload.comment || "No feedback or comments provided.",
      reviewer: payload.reviewer,
      recipientEmail: payload.recipientEmail // Forward custom recipient email
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Inbox update processed" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Scrapes spreadsheet row values and routes to the central alert dispatcher
function triggerAlertFromRow(sheet, row, status, decision, reviewer) {
  var requestId = sheet.getRange(row, 1).getValue();
  var subject = sheet.getRange(row, 2).getValue();
  var type = sheet.getRange(row, 3).getValue();
  var requesterName = sheet.getRange(row, 4).getValue();
  var dateLogged = sheet.getRange(row, 5).getValue();
  var cost = sheet.getRange(row, 9).getValue();
  var feedback = sheet.getRange(row, 11).getValue();
  var remarks = sheet.getRange(row, 8).getValue();
  
  sendWorkflowEmail({
    requestId: requestId,
    subject: subject,
    type: type,
    requesterName: requesterName,
    dateLogged: dateLogged,
    cost: cost,
    status: status,
    decision: decision,
    remarks: remarks,
    feedback: feedback || "No feedback or comments provided.",
    reviewer: reviewer
  });
}

// Send the HTML-enriched email dispatcher
function sendWorkflowEmail(data) {
  var recipient = data.recipientEmail || Session.getActiveUser().getEmail();
  if (!recipient || recipient.indexOf("@") === -1) {
    recipient = DEFAULT_RECIPIENT_EMAIL;
  }
  
  var emailSubject = "[Plant Ops " + data.status.toUpperCase() + "] Request #" + data.requestId + " Decision Alert";
  var badgeColor = data.status === "approved" ? "#06d6a0" : data.status === "rejected" ? "#ff4d4d" : "#ff9f1c";
  
  var htmlBody = \`
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07090d; padding: 40px 20px; color: #dde6f0; max-width: 600px; margin: 0 auto; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 2.5px; color: #00e5c3; font-weight: bold; display: block; margin-bottom: 8px;">REAL-TIME APP NOTIFICATION</span>
        <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Synapse Workflow Update</h2>
      </div>
      
      <div style="background-color: #0e1520; padding: 30px; border-radius: 12px; border: 1px solid #1f2d40; border-top: 4px solid \${badgeColor};">
        <div style="margin-bottom: 25px; border-bottom: 1px solid #1f2d40; padding-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; font-weight: 700; color: #7a95b0; font-family: monospace;">REQUEST ID: #\${data.requestId}</span>
          <span style="background-color: \${badgeColor}; color: #07090d; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
            \${data.status}
          </span>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #141c28;">
            <td style="padding: 10px 0; color: #7a95b0; font-weight: 500;">Title / Subject</td>
            <td style="padding: 10px 0; color: #ffffff; font-weight: 700; text-align: right;">\${data.subject}</td>
          </tr>
          <tr style="border-bottom: 1px solid #141c28;">
            <td style="padding: 10px 0; color: #7a95b0; font-weight: 500;">Type</td>
            <td style="padding: 10px 0; color: #dde6f0; text-align: right;">\${data.type}</td>
          </tr>
          <tr style="border-bottom: 1px solid #141c28;">
            <td style="padding: 10px 0; color: #7a95b0; font-weight: 500;">Requester</td>
            <td style="padding: 10px 0; color: #dde6f0; text-align: right;">\${data.requesterName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #141c28;">
            <td style="padding: 10px 0; color: #7a95b0; font-weight: 500;">Date Logged</td>
            <td style="padding: 10px 0; color: #7a95b0; text-align: right;">\${data.dateLogged}</td>
          </tr>
          <tr style="border-bottom: 1px solid #141c28;">
            <td style="padding: 10px 0; color: #7a95b0; font-weight: 500;">Estimated Cost</td>
            <td style="padding: 10px 0; color: #00e5c3; font-weight: 800; text-align: right;">₹\${Number(data.cost).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #7a95b0; font-weight: 500;">Reviewer Name</td>
            <td style="padding: 10px 0; color: #ffffff; text-align: right; font-weight: 600;">\${data.reviewer}</td>
          </tr>
        </table>
        
        <div style="background-color: #141c28; border: 1px solid #1f2d40; padding: 15px; border-radius: 8px;">
          <h4 style="margin: 0 0 6px 0; color: #00e5c3; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Approver Feedback & Comments:</h4>
          <p style="margin: 0; font-size: 13px; color: #7a95b0; font-style: italic;">\${data.feedback}</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #3d5570;">
        This alert was compiled via Google Sheets & Synapse Plant Ops Engine.
      </div>
    </div>
  \`;
  
  MailApp.sendEmail({
    to: recipient,
    subject: emailSubject,
    htmlBody: htmlBody
  });
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setCopied(true);
    toast.success('Google Apps Script copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00e5c3]/5 rounded-bl-full pointer-events-none" />
      <span className="text-[10px] uppercase font-bold tracking-widest text-[#00e5c3]">REAL-TIME AUTOMATION SETUP</span>
      <h3 className="text-xl font-bold font-sans text-[#dde6f0] mt-1 mb-4">Google Sheet Workflow & In-App Email Setup</h3>
      
      <p className="text-sm text-[#7a95b0] mb-6 leading-relaxed max-w-3xl">
        Standard approvals are fully managed <strong>directly within the application interface</strong>. Since Google Sheets does not run sheet-edit macros for external API requests, you can deploy the Apps Script as a <strong>Web App</strong> and paste the link below to receive immediate emails as soon as you approve or reject items in-app!
      </p>

      {/* Optional Web App URL Config */}
      <div className="bg-[#141c28]/70 border border-[#1f2d40] rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-5 h-5 text-[#00e5c3]" />
          <h4 className="text-sm font-bold text-[#dde6f0] uppercase tracking-wider font-sans">Workflow Mail Dispatcher Webhook URL</h4>
        </div>
        <p className="text-xs text-[#7a95b0] mb-4 leading-relaxed">
          Pasting your deployed Apps Script Web App URL below enables the in-app <strong>APPROVE</strong> and <strong>REJECT</strong> buttons to send emails instantaneously using your Google Account credentials.
        </p>
        <div className="flex gap-3 max-w-2xl">
          <input
            type="text"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={webAppUrl}
            onChange={(e) => saveWebAppUrl(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-[#07090d] border border-[#1f2d40] rounded-lg text-sm text-[#dde6f0] placeholder-[#3d5570] focus:outline-none focus:border-[#00e5c3] font-mono"
          />
          {webAppUrl && (
            <button
              onClick={() => {
                saveWebAppUrl('');
                toast.success('Cleared Web App URL');
              }}
              className="px-3.5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs text-red-400 font-bold uppercase transition-all"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-[11px] text-[#5a6e85] mt-2 leading-relaxed">
          💡 Go to your Google Apps Script editor, click <strong>Deploy &gt; New deployment</strong>, select type <strong>Web app</strong>, choose Execute as: <strong>Me</strong> and Who has access: <strong>Anyone</strong>, then copy & paste the resulting URL here.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#141c28]/40 border border-[#1f2d40] p-5 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#00e5c3]/10 text-[#00e5c3] flex items-center justify-center font-bold text-xs mb-3">✓</div>
          <h4 className="text-sm font-bold text-[#dde6f0] mb-2 font-sans">In-App Direct Approval</h4>
          <p className="text-xs text-[#7a95b0] leading-relaxed">
            Approvers can view details, write comments and hit <strong>APPROVE / REJECT</strong>. This automatically updates Google Sheet cells <code>G (Current Status)</code>, <code>J (Decision)</code>, <code>K (Feedback)</code>, <code>L (Reviewed At)</code>, and <code>M (Reviewed By)</code>.
          </p>
        </div>

        <div className="bg-[#141c28]/40 border border-[#1f2d40] p-5 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#00e5c3]/10 text-[#00e5c3] flex items-center justify-center font-bold text-xs mb-3">✉</div>
          <h4 className="text-sm font-bold text-[#dde6f0] mb-2 font-sans">Email Alerts Trigger Setup</h4>
          <p className="text-xs text-[#7a95b0] leading-relaxed">
            To trigger alerts when manually editing spreadsheet dropdowns, click the clock icon (&ldquo;Triggers&rdquo;) on the Apps Script sidebar, click <strong>Add Trigger</strong>, set function to <strong>handleSheetEdit</strong>, and event type to <strong>On edit</strong>.
          </p>
        </div>

        <div className="bg-[#141c28]/40 border border-[#1f2d40] p-5 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#00e5c3]/10 text-[#00e5c3] flex items-center justify-center font-bold text-xs mb-3">⚡</div>
          <h4 className="text-sm font-bold text-[#dde6f0] mb-2 font-sans">Manual Spreadsheet Support</h4>
          <p className="text-xs text-[#7a95b0] leading-relaxed">
            The script also supports manual changes. If an admin edits the sheet <em>Approver Decision</em> column directly, it instantly matches and sends the customized email notification too!
          </p>
        </div>
      </div>

      {/* Dynamic Tester Interface */}
      {profile?.role === 'admin' && (
        <div className="bg-[#141c28]/70 border border-[#1f2d40] rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-[#ff9f1c]" />
            <h4 className="text-sm font-bold text-[#dde6f0] uppercase tracking-wider font-sans">Active Approval Hierarchy (Simulation & Tester Panel)</h4>
          </div>
          <p className="text-xs text-[#7a95b0] mb-5 leading-relaxed">
            The system uses a sequential 3-Stage Approval Routing Chain. Standard accounts can only approve requests matching their defined Level. Use the interactive switcher below to toggle your current active testing role:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <button
              onClick={() => updateProfile({ role: 'requester', approvalLevel: 0 })}
              className={cn(
                "p-4 rounded-xl border flex flex-col text-left transition-all",
                profile?.role === 'requester'
                  ? "bg-[#2d9cff]/10 border-[#2d9cff]/40 text-[#2d9cff]"
                  : "bg-[#0c1017] border-[#1f2d40] text-[#7a95b0] hover:border-[#2d9cff]/20"
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a95b0] mb-1">Standard Tier</span>
              <span className="text-sm font-bold text-[#dde6f0]">Requester</span>
              <span className="text-[11px] mt-1 text-[#5a6e85]">Can log requests & track statuses, but cannot approve any levels.</span>
            </button>

            <button
              onClick={() => updateProfile({ role: 'approver', approvalLevel: 1 })}
              className={cn(
                "p-4 rounded-xl border flex flex-col text-left transition-all",
                profile?.role === 'approver' && profile?.approvalLevel === 1
                  ? "bg-[#ff9f1c]/10 border-[#ff9f1c]/40 text-[#ff9f1c]"
                  : "bg-[#0c1017] border-[#1f2d40] text-[#7a95b0] hover:border-[#ff9f1c]/20"
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a95b0] mb-1">Level 1 Approver</span>
              <span className="text-sm font-bold text-[#dde6f0]">Plant Engineer</span>
              <span className="text-[11px] mt-1 text-[#5a6e85]">First stage reviewer. Authorizes engineering specifications.</span>
            </button>

            <button
              onClick={() => updateProfile({ role: 'approver', approvalLevel: 2 })}
              className={cn(
                "p-4 rounded-xl border flex flex-col text-left transition-all",
                profile?.role === 'approver' && profile?.approvalLevel === 2
                  ? "bg-[#ff9f1c]/10 border-[#ff9f1c]/40 text-[#ff9f1c]"
                  : "bg-[#0c1017] border-[#1f2d40] text-[#7a95b0] hover:border-[#ff9f1c]/20"
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a95b0] mb-1">Level 2 Approver</span>
              <span className="text-sm font-bold text-[#dde6f0]">HO Engg. Dept</span>
              <span className="text-[11px] mt-1 text-[#5a6e85]">Second stage reviewer. Examines corporate compliance.</span>
            </button>

            <button
              onClick={() => updateProfile({ role: 'admin', approvalLevel: 3 })}
              className={cn(
                "p-4 rounded-xl border flex flex-col text-left transition-all",
                profile?.role === 'admin'
                  ? "bg-[#ef476f]/10 border-[#ef476f]/40 text-[#ef476f]"
                  : "bg-[#0c1017] border-[#1f2d40] text-[#7a95b0] hover:border-[#ef476f]/20"
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a95b0] mb-1">Ultimate Tier</span>
              <span className="text-sm font-bold text-[#dde6f0]">Plant Head / Admin</span>
              <span className="text-[11px] mt-1 text-[#5a6e85]">Level 3 / Super Admin. Evaluates HOD items & has full global privileges.</span>
            </button>
          </div>

          <div className="flex items-center gap-2 bg-[#0c1017] border border-[#1f2d40] rounded-lg p-3 text-xs">
            <p className="text-[#7a95b0]">
              Currently signed in as: <strong className="text-[#dde6f0]">{profile?.name} ({profile?.email})</strong> 
              &nbsp;— ACTIVE ROLE: &nbsp;
              <span className="text-xs px-2 py-0.5 rounded bg-[#1f2d40] text-[#00e5c3] font-bold border border-[#1f2d40]">
                {profile?.role === 'admin' ? 'Super Administrator' : profile?.role === 'approver' ? `Approver L${profile?.approvalLevel} (${profile?.approvalLevel === 1 ? 'Plant Engineer' : 'HO Engg. Dept'})` : 'Requester'}
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="border border-[#1f2d40] rounded-xl overflow-hidden bg-[#07090d]">
        <div className="flex items-center justify-between px-5 py-3 bg-[#141c28] border-b border-[#1f2d40]">
          <span className="text-[10px] font-mono tracking-wider uppercase text-[#7a95b0] font-bold">google-apps-script.js</span>
          <button
            onClick={copyToClipboard}
            className="text-xs font-bold uppercase py-1.5 px-3 bg-[#00e5c3]/10 hover:bg-[#00e5c3]/20 border border-[#00e5c3]/35 rounded text-[#00e5c3] flex items-center gap-1.5 transition-all text-[11px]"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied script' : 'Copy workflow code'}
          </button>
        </div>
        <div className="p-5 max-h-[350px] overflow-auto font-mono text-xs text-[#8da2b3] leading-relaxed bg-[#07090d]">
          <pre>{googleAppsScriptCode}</pre>
        </div>
      </div>
    </div>
  );
}

export default function DatabaseHub() {
  const [subTab, setSubTab] = useState<'breakdowns' | 'enquiries' | 'pm' | 'inventory' | 'solutions' | 'training' | 'analytics' | 'workflow'>('breakdowns');
  const { accessToken, connectGoogleSheets } = useAuth();

  // Connected spreadsheet state persisted locally
  const [connectedSheet, setConnectedSheet] = useState<ConnectedSheetInfo | null>(null);
  const [availableSheets, setAvailableSheets] = useState<ConnectedSheetInfo[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // App data cache
  const [requests, setRequests] = useState<any[]>([]);
  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);

  // Subscriptions
  useEffect(() => {
    const unsubReq = RequestService.subscribeToRequests(setRequests);
    const unsubBrk = RequestService.subscribeToBreakdowns(setBreakdowns);
    const unsubEnq = RequestService.subscribeToEnquiries(setEnquiries);
    return () => {
      unsubReq();
      unsubBrk();
      unsubEnq();
    };
  }, []);

  // Hydrate spreadsheet state from global settings
  useEffect(() => {
    const unsubscribe = SettingsService.subscribeToGlobalSettings((settings) => {
      if (settings.plant_ops_spreadsheet_id && settings.plant_ops_spreadsheet_name) {
        setConnectedSheet({
          id: settings.plant_ops_spreadsheet_id,
          name: settings.plant_ops_spreadsheet_name,
          url: settings.plant_ops_spreadsheet_url || `https://docs.google.com/spreadsheets/d/${settings.plant_ops_spreadsheet_id}/edit`
        });
      } else {
        setConnectedSheet(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Drive spreadsheets once we are authenticated
  useEffect(() => {
    if (accessToken) {
      loadDriveSpreadsheets();
    }
  }, [accessToken]);

  const loadDriveSpreadsheets = async () => {
    if (!accessToken) return;
    setLoadingSheets(true);
    try {
      const sheets = await GoogleSheetsService.findSpreadsheets(accessToken);
      setAvailableSheets(sheets);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      toast.error('Please authenticate first');
      return;
    }
    setActionLoading(true);
    const tidyToast = toast.loading('Provisioning Master Sheet inside your Drive...');
    try {
      const sheetInfo = await GoogleSheetsService.createMasterSpreadsheet(accessToken);
      await SettingsService.saveGlobalSettings({
        plant_ops_spreadsheet_id: sheetInfo.id,
        plant_ops_spreadsheet_name: sheetInfo.name,
        plant_ops_spreadsheet_url: sheetInfo.url
      });

      toast.loading('Pushing existing databases to Sheet tabs...', { id: tidyToast });
      await GoogleSheetsService.syncAllData(accessToken, sheetInfo.id, {
        requests,
        breakdowns,
        enquiries
      });

      toast.success('Successfully created and synchronized Google Sheets Master Database!', { id: tidyToast });
      loadDriveSpreadsheets();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create Master Spreadsheet', { id: tidyToast });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkExistingSheet = async (sheet: ConnectedSheetInfo) => {
    try {
      await SettingsService.saveGlobalSettings({
        plant_ops_spreadsheet_id: sheet.id,
        plant_ops_spreadsheet_name: sheet.name,
        plant_ops_spreadsheet_url: sheet.url
      });
      toast.success(`Successfully linked spreadsheet: "${sheet.name}"`);
    } catch (e) {
      console.error('Error linking spreadsheet:', e);
      toast.error('Failed to link spreadsheet configuration globally');
    }
  };

  const handleDisconnectSheet = async () => {
    if (window.confirm('Are you sure you want to decouple this Google Sheet? Local records inside the app won\'t undergo changes, but Sheets database sync will stop.')) {
      try {
        await SettingsService.saveGlobalSettings({
          plant_ops_spreadsheet_id: '',
          plant_ops_spreadsheet_name: '',
          plant_ops_spreadsheet_url: ''
        });
        toast.success('Spreadsheet disconnected successfully');
      } catch (e) {
        console.error('Error unlinking spreadsheet:', e);
        toast.error('Failed to unlink globally');
      }
    }
  };

  const handleForceSync = async () => {
    if (!accessToken || !connectedSheet) return;
    setActionLoading(true);
    const tidyToast = toast.loading('Executing database sync to Google Sheets...');
    try {
      await GoogleSheetsService.syncAllData(accessToken, connectedSheet.id, {
        requests,
        breakdowns,
        enquiries
      });
      toast.success('All tables (Requests, Breakdowns, Enquiries) updated in Google Sheets!', { id: tidyToast });
    } catch (e: any) {
      console.error(e);
      toast.error('Sync failed. Please ensure your token isn\'t expired.', { id: tidyToast });
    } finally {
      setActionLoading(false);
    }
  };

  const subNavs = [
    { id: 'breakdowns', label: 'Breakdowns Sub-Registry', icon: Activity },
    { id: 'enquiries', label: 'Enquiries Registry', icon: MessageSquare },
    { id: 'pm', label: 'Preventive Maintenance', icon: Wrench },
    { id: 'inventory', label: 'Spares Inventory', icon: Package },
    { id: 'solutions', label: 'Knowledge Base', icon: Lightbulb },
    { id: 'training', label: 'Staff Training', icon: GraduationCap },
    { id: 'analytics', label: 'Analytics Insights', icon: BarChart3 },
    { id: 'workflow', label: 'Review & Approvals (Sheets Setup)', icon: Sparkles },
  ] as const;

  return (
    <div className="space-y-6">
      {/* GOOGLE SHEETS SYNC CONTROL CARD */}
      <div className="bg-[#0f1520] border border-[#1f2d40] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00e5c3]/5 rounded-bl-full pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-[#00e5c3]/10 text-[#00e5c3] p-3.5 rounded-xl border border-[#00e5c3]/20">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#00e5c3] uppercase flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5" /> External MASTER DATABASE (Google Sheets)
              </span>
              <h2 className="text-xl font-bold font-sans text-[#dde6f0] mt-1">Google Sheets Database Sync Engine</h2>
              <p className="text-xs text-[#7a95b0] mt-1 max-w-xl leading-relaxed">
                Connect and export your plant operations registers completely off-platform. Enjoy total independence with an external database that automatically registers logs inside Google Drive.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {!accessToken ? (
              <button
                onClick={connectGoogleSheets}
                className="bg-[#00e5c3] hover:brightness-110 text-[#07090d] px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-lg shadow-[#00e5c3]/10"
              >
                Sign In & Connect Google Sheets
              </button>
            ) : connectedSheet ? (
              <div className="flex flex-wrap gap-2.5">
                <a
                  href={connectedSheet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#141c28] border border-[#1f2d40] hover:text-[#00e5c3] hover:border-[#00e5c3]/30 text-[#dde6f0] px-4.5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 group"
                >
                  Open Sheet Database <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
                <button
                  onClick={handleForceSync}
                  disabled={actionLoading}
                  className="bg-[#00e5c3] text-[#07090d] hover:brightness-105 active:scale-95 disabled:opacity-50 px-4.5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Force Sync Now
                </button>
                <button
                  onClick={handleDisconnectSheet}
                  className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-3.5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all"
                  title="Disconnect sheet"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleCreateNewSheet}
                disabled={actionLoading}
                className="bg-[#00e5c3] hover:brightness-110 text-[#07090d] disabled:opacity-60 px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 shadow-lg shadow-[#00e5c3]/10"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Create Master Database Sheet
              </button>
            )}
          </div>
        </div>

        {/* CONNECTION REPORT MODULES */}
        {accessToken && (
          <div className="mt-6 border-t border-[#1f2d40]/60 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Associated Spreadsheet Details Card */}
            <div>
              <span className="text-[10px] text-[#3d5570] uppercase font-bold tracking-wider">Active connection</span>
              {connectedSheet ? (
                <div className="bg-[#141c28]/40 border border-[#1f2d40] p-4 rounded-xl mt-1.5 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#dde6f0] truncate max-w-xs">{connectedSheet.name}</h4>
                    <p className="text-[9px] font-mono text-[#7a95b0] truncate mt-0.5">{connectedSheet.id}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#06d6a0] bg-[#06d6a0]/10 px-2 py-0.5 rounded border border-[#06d6a0]/20 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Separate Database Active
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-[#1f2d40] p-4 rounded-xl mt-1.5 text-center text-xs text-[#7a95b0]">
                  <AlertCircle className="w-5 h-5 text-[#ff9f1c] mx-auto mb-2 opacity-50" />
                  Your offline plant database is unlinked. Select a spreadsheet below or create a new one to enable sync.
                </div>
              )}
            </div>

            {/* Existing Spreadsheets Lister */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-[#3d5570] uppercase font-bold tracking-wider">Spreadsheets in your Drive</span>
                <button 
                  onClick={loadDriveSpreadsheets}
                  className="text-[9px] font-bold text-[#00e5c3] hover:underline uppercase flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Reload List
                </button>
              </div>

              {loadingSheets ? (
                <div className="p-3 text-center text-xs text-[#7a95b0] flex items-center justify-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00e5c3]" /> Fetching files from Google Drive...
                </div>
              ) : availableSheets.length === 0 ? (
                <div className="text-xs text-[#3d5570] border border-[#1f2d40] p-3 rounded-xl italic bg-[#141c28]/10 text-center">
                  No spreadsheets detected. Click "Create Master Database Sheet" above to set up one!
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                  {availableSheets.map((sheet) => {
                    const isLinked = connectedSheet?.id === sheet.id;
                    return (
                      <div 
                        key={sheet.id}
                        className={`flex items-center justify-between gap-3 p-2 rounded-lg border text-xs transition-all ${
                          isLinked 
                            ? 'bg-[#00e5c3]/5 border-[#00e5c3]/30' 
                            : 'bg-[#141c28]/30 border-[#1f2d40] hover:bg-[#141c28]/70'
                        }`}
                      >
                        <span className="text-[#dde6f0] font-medium truncate flex-1">{sheet.name}</span>
                        {isLinked ? (
                          <span className="text-[9px] font-bold uppercase text-[#00e5c3]">Connected</span>
                        ) : (
                          <button
                            onClick={() => handleLinkExistingSheet(sheet)}
                            className="bg-[#2d9cff]/10 text-[#2d9cff] border border-[#2d9cff]/25 hover:bg-[#2d9cff]/20 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider"
                          >
                            Link
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Database tab selector switches */}
      <div className="bg-[#0f1520] border border-[#1f2d40] p-4 rounded-2xl flex flex-wrap gap-2">
        {subNavs.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all ${
                isActive 
                  ? "bg-[#00e5c3] text-[#07090d] shadow-lg shadow-[#00e5c3]/15" 
                  : "text-[#7a95b0] bg-[#141c28]/40 border border-[#1f2d40]/40 hover:text-[#dde6f0] hover:bg-[#141c28]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render subcomponents based on subTab */}
      <div className="transition-all">
        {subTab === 'breakdowns' && <BreakdownView />}
        {subTab === 'enquiries' && <EnquiryView />}
        {subTab === 'pm' && <PMView />}
        {subTab === 'inventory' && <InventoryView />}
        {subTab === 'solutions' && <SolutionsView />}
        {subTab === 'training' && <TrainingView />}
        {subTab === 'analytics' && <AnalyticsView />}
        {subTab === 'workflow' && <WorkflowSetupView />}
      </div>
    </div>
  );
}
