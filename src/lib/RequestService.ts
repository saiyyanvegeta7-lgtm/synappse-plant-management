import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { Request, RequestStatus, ApprovalStep, UserProfile, BreakdownRequest, Enquiry } from '../types';
import { GoogleSheetsService } from './GoogleSheetsService';
import { UserService } from './UserService';
import { SettingsService } from './SettingsService';

const COLLECTION = 'requests';

export const RequestService = {
  async getSettings() {
    try {
      const globalSettings = await SettingsService.getGlobalSettings();
      if (globalSettings) return globalSettings;
    } catch (e) {
      console.error('Error fetching global settings in RequestService:', e);
    }
    return {
      plant_ops_workflow_web_app_url: localStorage.getItem('plant_ops_workflow_web_app_url') || undefined,
      plant_ops_spreadsheet_id: localStorage.getItem('plant_ops_spreadsheet_id') || undefined,
      plant_ops_spreadsheet_name: localStorage.getItem('plant_ops_spreadsheet_name') || undefined,
      plant_ops_spreadsheet_url: localStorage.getItem('plant_ops_spreadsheet_url') || undefined,
    };
  },

  async getApproverEmailsForLevel(level: number): Promise<string[]> {
    try {
      const users = await UserService.getAllUsers();
      if (level === 3) {
        const adminApprovers = users.filter(u => 
          (u.role === 'approver' && u.approvalLevel === 3) || 
          u.role === 'admin'
        );
        return adminApprovers.map(u => u.email).filter(Boolean);
      } else {
        const matching = users.filter(u => u.role === 'approver' && u.approvalLevel === level);
        return matching.map(u => u.email).filter(Boolean);
      }
    } catch (error) {
      console.error('Error fetching approver emails:', error);
      return [];
    }
  },

  async getRequesterEmail(uid: string): Promise<string | undefined> {
    try {
      const users = await UserService.getAllUsers();
      const user = users.find(u => u.uid === uid);
      return user?.email;
    } catch (e) {
      console.error('Error finding requester email:', e);
    }
    return undefined;
  },

  async createRequest(data: Partial<Request>, user: UserProfile, accessToken?: string) {
    try {
      const settings = await this.getSettings();
      const approvalSteps: ApprovalStep[] = [
        { level: 1, role: 'Plant Engineer', person: 'TBD', status: 'active', date: '–', comment: '' },
        { level: 2, role: 'Head Office Engg. Dept.', person: 'TBD', status: 'waiting', date: '–', comment: '' },
        { level: 3, role: 'Plant Head / HOD', person: 'TBD', status: 'waiting', date: '–', comment: '' },
      ];

      const newRequest = {
        ...data,
        status: 'pending' as RequestStatus,
        requesterUid: user.uid,
        requesterName: user.name,
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        approvalSteps,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, COLLECTION), newRequest);

      // Auto-append to Connected Google Sheets Database
      const spreadsheetId = settings?.plant_ops_spreadsheet_id;
      if (accessToken && spreadsheetId) {
        const row = [
          docRef.id,
          data.title || '',
          data.type || '',
          user.name || '',
          newRequest.date,
          data.priority || '',
          newRequest.status,
          data.desc || '',
          data.cost || 0,
          '', // Approver Decision
          '', // Approver Feedback
          '', // Last Reviewed At
          ''  // Reviewed By
        ];
        GoogleSheetsService.appendRow(accessToken, spreadsheetId, 'Requests', row).catch(console.error);
      }

      // Dispatch Webhook & Automated Direct Gmail notification to the Level 1 approver immediately
      try {
        const l1Emails = await this.getApproverEmailsForLevel(1);
        const finalL1Emails = l1Emails.length > 0 ? l1Emails : ['purandhar@patilgroup.com'];
        const recipientEmailStr = finalL1Emails.join(', ');

        // 1. Send direct Gmail automatically in the background via user's Google OAuth provider
        if (accessToken) {
          try {
            const mailSubject = `[Synapse Action Required] Review Request: ${data.title} (Priority: ${data.priority})`;
            const activeOrigin = window.location.origin;
            const mailBody = `Dear Plant Engineer / Level 1 Reviewer,

A new plant operations & maintenance request has been raised on the Synapse Plant Management System and has been registered automatically. It is awaiting your immediate review at Level 1 (Plant Engineer).

=======================================================
REQUISITION METADATA
=======================================================
• Request ID: #${docRef.id}
• Request Title: ${data.title}
• Category: ${data.type}
• Priority Level: ${data.priority}
• Estimated Budget: ₹${(data.cost || 0).toLocaleString('en-IN')}
• Logged By: ${user.name} (${user.email})
• Date Initiated: ${newRequest.date}

=======================================================
DETAILED JUSTIFICATION & REMARKS
=======================================================
${data.desc || ''}

=======================================================
HOW TO REVIEW & DECIDE
=======================================================
Please click the link below to access the Synapse Portal, sign in as Level 1 Approver, navigate to "My Approvals", and submit your review:

👉 Access Synapse System: ${activeOrigin}

Thank you,
Synapse Operations Notification Hub
`;
            const { GmailService } = await import('./GmailService');
            await GmailService.sendEmail(accessToken, finalL1Emails, mailSubject, mailBody);
            console.log('Direct automated email dispatched to Level 1 Approvers via Gmail API.');
          } catch (mailError) {
            console.error('Failed direct Gmail delivery:', mailError);
          }
        }

        // 2. Fallback / supplementary Webhook trigger
        const webAppUrl = settings?.plant_ops_workflow_web_app_url;
        if (webAppUrl) {
          fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requestId: docRef.id,
              status: 'pending',
              decision: 'Awaiting L1 Approval',
              remarks: data.desc || '',
              feedback: `A new plant maintenance/operation request has been raised by ${user.name} and is awaiting your immediate review at Level 1 (Plant Engineer).`,
              reviewer: user.name,
              subject: data.title || '',
              type: data.type || '',
              requesterName: user.name,
              dateLogged: newRequest.date,
              cost: data.cost || 0,
              recipientEmail: recipientEmailStr || undefined
            })
          }).catch(err => console.error('Error triggering new request webhook:', err));
        }
      } catch (err) {
        console.error('Failed to notify Level 1 approver:', err);
      }

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION);
    }
  },

  async updateApproval(docId: string, request: Request, currentLevel: number, user: UserProfile, action: 'approve' | 'reject', comment: string, accessToken?: string) {
    try {
      const settings = await this.getSettings();
      const updatedSteps = [...request.approvalSteps];
      const stepIndex = updatedSteps.findIndex(s => s.level === currentLevel);
      
      if (stepIndex === -1) return;

      const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      
      let finalStatus: RequestStatus = 'pending';
      let decisionStr = '';

      if (action === 'approve') {
        updatedSteps[stepIndex].status = 'approved';
        updatedSteps[stepIndex].person = user.name;
        updatedSteps[stepIndex].date = now;
        updatedSteps[stepIndex].comment = comment;

        // Move to next level if exists
        if (stepIndex < updatedSteps.length - 1) {
          updatedSteps[stepIndex + 1].status = 'active';
          finalStatus = 'review';
          decisionStr = `Approved (L${currentLevel})`;
        } else {
          // Fully approved
          finalStatus = 'approved';
          decisionStr = 'Approved';
        }
      } else {
        updatedSteps[stepIndex].status = 'rejected';
        updatedSteps[stepIndex].person = user.name;
        updatedSteps[stepIndex].date = now;
        updatedSteps[stepIndex].comment = comment;
        
        finalStatus = 'rejected';
        decisionStr = 'Rejected';
      }

      await updateDoc(doc(db, COLLECTION, docId), {
        approvalSteps: updatedSteps,
        status: finalStatus
      });

      // Synchronize back to connected Google Sheet
      const spreadsheetId = settings?.plant_ops_spreadsheet_id;
      if (accessToken && spreadsheetId) {
        await GoogleSheetsService.updateRequestRow(
          accessToken,
          spreadsheetId,
          docId,
          finalStatus,
          decisionStr,
          comment,
          user.name
        );
      }

      // Direct automated reviewer alert via Gmail / Webhook
      let recipientEmails: string[] = [];
      let feedbackMessageStr = comment || 'No comments provided.';

      if (action === 'approve') {
        if (stepIndex < updatedSteps.length - 1) {
          // Pending next level approval
          recipientEmails = await this.getApproverEmailsForLevel(currentLevel + 1);
          feedbackMessageStr = `Level ${currentLevel} approved by ${user.name} with comment: "${comment || 'No comment'}". This request is now pending your immediate review at Level ${currentLevel + 1}.`;
        } else {
          // Fully approved! Notify requester.
          const reqEmail = await this.getRequesterEmail(request.requesterUid);
          if (reqEmail) recipientEmails.push(reqEmail);
          feedbackMessageStr = `Congratulations! Your request has been fully APPROVED by ${user.name} at the final level with comment: "${comment || 'No comment'}".`;
        }
      } else {
        // Rejected! Notify requester.
        const reqEmail = await this.getRequesterEmail(request.requesterUid);
        if (reqEmail) recipientEmails.push(reqEmail);
        feedbackMessageStr = `Your request has been REJECTED by ${user.name} at Level ${currentLevel} with comment: "${comment || 'No comment'}".`;
      }

      const finalRecipientEmails = recipientEmails.length > 0 ? recipientEmails : ['purandhar@patilgroup.com'];
      const recipientEmailStr = finalRecipientEmails.join(', ');

      // 1. Direct Automated Gmail Send
      if (accessToken && finalRecipientEmails.length > 0) {
        try {
          let mailSubject = `[Synapse Update] Request #${docId} Status Update`;
          let mailBody = '';
          const activeOrigin = window.location.origin;

          if (action === 'approve') {
            if (stepIndex < updatedSteps.length - 1) {
              mailSubject = `[Synapse Action Required] Review Request: ${request.title} (Level ${currentLevel + 1} Review)`;
              mailBody = `Dear Level ${currentLevel + 1} Reviewer,

A plant operations & maintenance request has been APPROVED at Level ${currentLevel} by ${user.name} and has advanced to Stage ${currentLevel + 1} for your immediate review.

=======================================================
REQUISITION METADATA
=======================================================
• Request ID: #${docId}
• Request Title: ${request.title}
• Category: ${request.type}
• Priority Level: ${request.priority}
• Estimated Budget: ₹${(request.cost || 0).toLocaleString('en-IN')}
• Logged By: ${request.requesterName}
• Date Initiated: ${request.date}

=======================================================
REVIEW HISTORY & REMARKS
=======================================================
• Approved At Level ${currentLevel} By: ${user.name}
• Approver Comments: "${comment || 'No comments provided'}"

=======================================================
HOW TO REVIEW & DECIDE
=======================================================
Please click the link below to access the Synapse Portal, sign in as Level ${currentLevel + 1} Approver, navigate to "My Approvals", and submit your review:

👉 Access Synapse System: ${activeOrigin}

Thank you,
Synapse Operations Notification Hub
`;
            } else {
              mailSubject = `[Synapse Status: APPROVED] Requisition #${docId} Fully Approved`;
              mailBody = `Dear ${request.requesterName},

We are pleased to inform you that your plant operations & maintenance request has been FULLY APPROVED at Stage 3 (final level) by ${user.name}.

=======================================================
REQUISITION METADATA
=======================================================
• Request ID: #${docId}
• Request Title: ${request.title}
• Category: ${request.type}
• Estimated Budget: ₹${(request.cost || 0).toLocaleString('en-IN')}
• Date Completed: ${new Date().toLocaleDateString('en-GB')}

=======================================================
FINAL COMMENTS & INSTRUCTIONS
=======================================================
• Decided By: ${user.name}
• Comments: "${comment || 'Approved without further remarks'}"

👉 Track Status In Portal: ${activeOrigin}

Thank you,
Synapse Operations Notification Hub
`;
            }
          } else {
            mailSubject = `[Synapse Status: REJECTED] Requisition #${docId} Rejected`;
            mailBody = `Dear ${request.requesterName},

Your plant operations & maintenance request has been REJECTED at Level ${currentLevel} by ${user.name}.

=======================================================
REQUISITION DETAILS
=======================================================
• Request ID: #${docId}
• Request Title: ${request.title}
• Category: ${request.type}
• Estimated Budget: ₹${(request.cost || 0).toLocaleString('en-IN')}

=======================================================
REJECTION REASON & REVIEWS
=======================================================
• Rejected At Level ${currentLevel} By: ${user.name}
• Reason/Feedback: "${comment || 'No comment provided'}"

👉 Track Status In Portal: ${activeOrigin}

Thank you,
Synapse Operations Notification Hub
`;
          }

          const { GmailService } = await import('./GmailService');
          await GmailService.sendEmail(accessToken, finalRecipientEmails, mailSubject, mailBody);
          console.log('Automated workflow stage email dispatched successfully via Gmail REST API.');
        } catch (mailError) {
          console.error('Failed to dispatch direct email notification:', mailError);
        }
      }

      // 2. Optional webhook trigger
      const webAppUrl = settings?.plant_ops_workflow_web_app_url;
      if (webAppUrl) {
        fetch(webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requestId: docId,
            status: finalStatus,
            decision: decisionStr,
            remarks: request.desc || '',
            feedback: feedbackMessageStr,
            reviewer: user.name,
            subject: request.title || '',
            type: request.type || '',
            requesterName: request.requesterName || '',
            dateLogged: request.date || '',
            cost: request.cost || 0,
            recipientEmail: recipientEmailStr || undefined // Falls back to default if no emails found
          })
        }).catch(err => console.error('Error triggering webhook:', err));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, COLLECTION);
    }
  },

  subscribeToRequests(callback: (requests: Request[]) => void) {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Request));
      callback(requests);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION);
    });
  },

  async createBreakdownRequest(data: {
    assetName: string;
    assetTag: string;
    failureDesc: string;
    area: string;
    priority: any;
  }, user: UserProfile, accessToken?: string) {
    try {
      const settings = await this.getSettings();
      const year = new Date().getFullYear();
      const randomPart = Math.floor(10000 + Math.random() * 90000); // 5 digits
      const workOrderNumber = `WO-${year}-${randomPart}`;

      const newBreakdown = {
        workOrderNumber,
        assetName: data.assetName,
        assetTag: data.assetTag,
        failureDesc: data.failureDesc,
        area: data.area,
        priority: data.priority,
        reportedByUid: user.uid,
        reportedByName: user.name,
        reportedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'Reported',
        assignedTo: 'Unassigned',
        actionsTaken: '',
        rootCause: '',
        sparesUsed: '',
        downtimeDuration: 0,
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'breakdowns'), newBreakdown);

      // Auto-append to Connected Google Sheets Database
      const spreadsheetId = settings?.plant_ops_spreadsheet_id;
      if (accessToken && spreadsheetId) {
        const row = [
          workOrderNumber,
          data.assetName,
          data.assetTag,
          data.failureDesc,
          data.area,
          data.priority,
          user.name,
          newBreakdown.reportedAt,
          newBreakdown.status,
          newBreakdown.assignedTo,
          newBreakdown.actionsTaken,
          newBreakdown.rootCause,
          newBreakdown.sparesUsed,
          newBreakdown.downtimeDuration
        ];
        GoogleSheetsService.appendRow(accessToken, spreadsheetId, 'Breakdowns', row).catch(console.error);
      }

      return { id: docRef.id, workOrderNumber };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'breakdowns');
    }
  },

  async updateBreakdownRequest(docId: string, data: Partial<BreakdownRequest>) {
    try {
      await updateDoc(doc(db, 'breakdowns', docId), {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'breakdowns');
    }
  },

  subscribeToBreakdowns(callback: (breakdowns: BreakdownRequest[]) => void) {
    const q = query(collection(db, 'breakdowns'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const breakdowns = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BreakdownRequest));
      callback(breakdowns);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'breakdowns');
    });
  },

  async createEnquiry(data: {
    subject: string;
    type: 'Procurement' | 'Maintenance Services' | 'Safety Audit' | 'Spares Supply' | 'General';
    senderName: string;
    senderContact: string;
    details: string;
    priority: any;
  }, user: UserProfile, accessToken?: string) {
    try {
      const settings = await this.getSettings();
      const year = new Date().getFullYear();
      const randomPart = Math.floor(10000 + Math.random() * 90000); // 5 digits
      const enquiryNumber = `ENQ-${year}-${randomPart}`;

      const newEnquiry = {
        enquiryNumber,
        subject: data.subject,
        type: data.type,
        senderName: data.senderName,
        senderContact: data.senderContact,
        details: data.details,
        priority: data.priority,
        assignedTo: 'Unassigned',
        status: 'Open',
        submittedByUid: user.uid,
        submittedByName: user.name,
        submittedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        responseDetails: '',
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'enquiries'), newEnquiry);

      // Auto-append to Connected Google Sheets Database
      const spreadsheetId = settings?.plant_ops_spreadsheet_id;
      if (accessToken && spreadsheetId) {
        const row = [
          enquiryNumber,
          data.subject,
          data.type,
          data.priority,
          newEnquiry.status,
          data.senderName,
          data.senderContact,
          data.details,
          user.name,
          newEnquiry.submittedAt,
          newEnquiry.assignedTo,
          newEnquiry.responseDetails
        ];
        GoogleSheetsService.appendRow(accessToken, spreadsheetId, 'Enquiries', row).catch(console.error);
      }

      return { id: docRef.id, enquiryNumber };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'enquiries');
    }
  },

  async updateEnquiry(docId: string, data: Partial<Enquiry>) {
    try {
      await updateDoc(doc(db, 'enquiries', docId), {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'enquiries');
    }
  },

  subscribeToEnquiries(callback: (enquiries: Enquiry[]) => void) {
    const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const enquiries = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Enquiry));
      callback(enquiries);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'enquiries');
    });
  }
};
