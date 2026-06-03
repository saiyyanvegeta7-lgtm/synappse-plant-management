export interface ConnectedSheetInfo {
  id: string;
  name: string;
  url: string;
}

const HEADER_REQUESTS = [
  'Request ID', 'Subject', 'Type', 'Requester Name', 'Date Logged', 'Priority', 'Current Status', 'Justification / Remarks', 'Estimated Cost ($)', 'Approver Decision', 'Approver Feedback', 'Last Reviewed At', 'Reviewed By'
];

const HEADER_BREAKDOWNS = [
  'Work Order Number', 'Asset Name', 'Asset Tag', 'Failure Description', 'Area / Line', 'Priority', 'Reported By', 'Reported At', 'Status', 'Assigned To', 'Actions Taken', 'Root Cause Analysis', 'Spares / Parts Used', 'Downtime (Mins)'
];

const HEADER_ENQUIRIES = [
  'Enquiry Number', 'Subject', 'Type', 'Priority', 'Status', 'Sender Name', 'Sender Contact', 'Details / Inquiry Content', 'Submitted By', 'Submitted At', 'Assigned Team Member', 'Resolution Details'
];

export const GoogleSheetsService = {
  /**
   * Search for any spreadsheets in user's Drive to let them select one, or recognize our custom one
   */
  async findSpreadsheets(accessToken: string): Promise<ConnectedSheetInfo[]> {
    try {
      const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error(`Google Drive API error: ${res.statusText}`);
      }

      const data = await res.json();
      return (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`
      }));
    } catch (error) {
      console.error('Error finding spreadsheets:', error);
      throw error;
    }
  },

  /**
   * Create a master database spreadsheet with dedicated tabs for each dataset
   */
  async createMasterSpreadsheet(accessToken: string): Promise<ConnectedSheetInfo> {
    try {
      const body = {
        properties: {
          title: `Plant Operations Master Database - ${new Date().toLocaleDateString('en-GB')}`
        },
        sheets: [
          { properties: { title: 'Requests' } },
          { properties: { title: 'Breakdowns' } },
          { properties: { title: 'Enquiries' } },
          { properties: { title: 'Preventive_Maintenance' } },
          { properties: { title: 'Spares_Inventory' } },
          { properties: { title: 'Knowledge_Base' } }
        ]
      };

      const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error(`Google Sheets creation failed: ${res.statusText}`);
      }

      const spreadsheet = await res.json();
      const spreadsheetId = spreadsheet.spreadsheetId;
      const url = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      // Set headers for each of the core sheets
      await this.initHeaders(accessToken, spreadsheetId);

      return {
        id: spreadsheetId,
        name: body.properties.title,
        url
      };
    } catch (error) {
      console.error('Error creating master spreadsheet:', error);
      throw error;
    }
  },

  /**
   * Helper to write headers to a freshly created spreadsheet
   */
  async initHeaders(accessToken: string, spreadsheetId: string) {
    const data = [
      { range: 'Requests!A1:I1', values: [HEADER_REQUESTS] },
      { range: 'Breakdowns!A1:N1', values: [HEADER_BREAKDOWNS] },
      { range: 'Enquiries!A1:L1', values: [HEADER_ENQUIRIES] }
    ];

    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data
        })
      });

      if (!res.ok) {
        console.warn('Could not initialize spreadsheet headers', await res.text());
      }
    } catch (e) {
      console.error('Error initializing headers:', e);
    }
  },

  /**
   * Append a single row of data to a sheet tab
   */
  async appendRow(accessToken: string, spreadsheetId: string, sheetName: string, rowValues: any[]) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowValues]
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to append row: ${text}`);
      }
    } catch (error) {
      console.error(`Error appending row to ${sheetName} sheet:`, error);
    }
  },

  /**
   * Fully synchronize whole tables up to the Google Sheet tab
   */
  async syncDataset(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string,
    headers: string[],
    rows: any[][]
  ) {
    try {
      // 1. Clear the sheet range (e.g., Requests!A2:Z1000)
      const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:Z10000:clear`;
      await fetch(clearUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      // 2. Put headers in case they are missing, and append the rows
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`;
      const body = {
        values: [headers, ...rows]
      };

      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error(`Sync error on tab ${sheetName}: ${res.statusText}`);
      }
    } catch (error) {
      console.error(`Failed syncing dataset: ${sheetName}`, error);
      throw error;
    }
  },

  /**
   * Compile and synchronize all data formats
   */
  async syncAllData(
    accessToken: string,
    spreadsheetId: string,
    data: {
      requests: any[];
      breakdowns: any[];
      enquiries: any[];
    }
  ) {
    // Format requests rows
    const requestRows = data.requests.map(r => [
      r.id || '',
      r.title || r.subject || '',
      r.type || '',
      r.requesterName || '',
      r.date || '',
      r.priority || '',
      r.status || '',
      r.desc || r.justification || '',
      r.cost || r.estimatedCost || 0,
      r.approvalDecision || r.approverDecision || '',
      r.approvalFeedback || r.approverFeedback || '',
      r.lastReviewedAt || '',
      r.reviewedBy || ''
    ]);

    // Format breakdown rows
    const breakdownRows = data.breakdowns.map(b => [
      b.workOrderNumber || '',
      b.assetName || '',
      b.assetTag || '',
      b.failureDesc || '',
      b.area || '',
      b.priority || '',
      b.reportedByName || '',
      b.reportedAt || '',
      b.status || '',
      b.assignedTo || '',
      b.actionsTaken || '',
      b.rootCause || '',
      b.sparesUsed || '',
      b.downtimeDuration || 0
    ]);

    // Format enquiry rows
    const enquiryRows = data.enquiries.map(e => [
      e.enquiryNumber || '',
      e.subject || '',
      e.type || '',
      e.priority || '',
      e.status || '',
      e.senderName || '',
      e.senderContact || '',
      e.details || '',
      e.submittedByName || '',
      e.submittedAt || '',
      e.assignedTo || '',
      e.responseDetails || ''
    ]);

    // Start synchronizing each tab sequentially
    await this.syncDataset(accessToken, spreadsheetId, 'Requests', HEADER_REQUESTS, requestRows);
    await this.syncDataset(accessToken, spreadsheetId, 'Breakdowns', HEADER_BREAKDOWNS, breakdownRows);
    await this.syncDataset(accessToken, spreadsheetId, 'Enquiries', HEADER_ENQUIRIES, enquiryRows);
  },

  /**
   * Update a specific request row in Google Sheets upon in-app approval or rejection
   */
  async updateRequestRow(
    accessToken: string,
    spreadsheetId: string,
    requestId: string,
    status: string,
    decision: string,
    feedback: string,
    reviewer: string
  ): Promise<boolean> {
    try {
      // 1. Fetch column A to locate the matching row
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests!A:A`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch Request IDs: ${res.statusText}`);
      }
      const data = await res.json();
      const rows = data.values || [];
      
      let rowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i][0] === requestId) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        console.warn(`Request ID ${requestId} not found in Google Sheets.`);
        return false;
      }

      const rowNumber = rowIndex + 1; // 1-indexed row number in Excel/Sheets
      const now = new Date().toLocaleString('en-GB');

      // 2. Perform batchUpdate
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
      const updateRes = await fetch(updateUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: `Requests!G${rowNumber}`,
              values: [[status]]
            },
            {
              range: `Requests!J${rowNumber}:M${rowNumber}`,
              values: [[decision, feedback, now, reviewer]]
            }
          ]
        })
      });

      if (!updateRes.ok) {
        console.error('Failed to update request row in Google Sheet:', await updateRes.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating request row in Google Sheets:', error);
      return false;
    }
  }
};
