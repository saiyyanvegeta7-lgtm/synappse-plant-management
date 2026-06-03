export type UserRole = 'admin' | 'approver' | 'requester';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  dept: string;
  approvalLevel?: number;
  canApprove?: boolean;
  photoURL?: string;
}

export type RequestStatus = 'draft' | 'pending' | 'review' | 'approved' | 'rejected';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type StepStatus = 'waiting' | 'active' | 'approved' | 'rejected';

export interface ApprovalStep {
  level: number;
  role: string;
  person: string;
  status: StepStatus;
  date: string;
  comment: string;
}

export interface Request {
  id: string;
  title: string;
  type: string;
  dept: string;
  status: RequestStatus;
  priority: Priority;
  cost: number;
  vendor: string;
  requesterUid: string;
  requesterName: string;
  date: string;
  dueDate: string;
  desc: string;
  approvalSteps: ApprovalStep[];
}

export interface PMTask {
  id: string;
  equip: string;
  task: string;
  zone: string;
  freq: string;
  dueDate: string;
  assignedTo: string;
  status: 'upcoming' | 'due' | 'overdue' | 'done';
  dur: number;
  spares: string;
  safety: string;
}

export interface InventoryItem {
  code: string;
  desc: string;
  category: string;
  equip: string;
  location: string;
  stock: number;
  unit: string;
  reorder: number;
  unitCost: number;
}

export interface Solution {
  id: string;
  title: string;
  category: string;
  equip: string;
  author: string;
  date: string;
  views: number;
  status: string;
  tags: string[];
  problem: string;
  steps: string;
}

export interface Training {
  id: string;
  name: string;
  category: string;
  dur: number;
  date: string;
  trainer: string;
  seats: number;
  enrolled: number;
  mandatory: string;
  status: string;
}

export type BreakdownStatus = 'Reported' | 'In Progress' | 'Resolved' | 'Closed';

export interface BreakdownRequest {
  id: string;
  workOrderNumber: string;
  assetName: string;
  assetTag: string;
  failureDesc: string;
  area: string;
  priority: Priority;
  reportedByUid: string;
  reportedByName: string;
  reportedAt: string;
  status: BreakdownStatus;
  assignedTo: string;
  actionsTaken?: string;
  rootCause?: string;
  sparesUsed?: string;
  downtimeDuration?: number;
  resolvedAt?: string;
  createdAt: any; // Timestamp
}

export type EnquiryStatus = 'Open' | 'Under Review' | 'Answered' | 'Closed';

export interface Enquiry {
  id: string;
  enquiryNumber: string;
  subject: string;
  type: 'Procurement' | 'Maintenance Services' | 'Safety Audit' | 'Spares Supply' | 'General';
  senderName: string;
  senderContact: string; // Email or phone
  details: string;
  priority: Priority;
  assignedTo: string;
  status: EnquiryStatus;
  submittedByUid: string;
  submittedByName: string;
  submittedAt: string; // Formatting date 'en-GB'
  responseDetails?: string;
  createdAt: any; // Timestamp
}


