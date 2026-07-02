export type UserRole = 'citizen' | 'officer' | 'admin';
export type UserStatus = 'pending' | 'approved';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  /** Officers start as 'pending' until an admin approves them. All others are 'approved'. */
  status?: UserStatus;
  heroPoints: number;
  pointsEarned?: number;
  badges: string[];
  departmentId?: string;
  // Profile fields (officers and admins)
  badgeId?: string;
  contactNumber?: string;
  city?: string;
  department?: string;
  ward?: string;
  createdAt: string;
}

export type IssueCategory =
  | 'Road Damage'
  | 'Garbage'
  | 'Water Leakage'
  | 'Street Light'
  | 'Electricity'
  | 'Traffic'
  | 'Public Safety'
  | 'Other';

export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type IssueStatus =
  | 'Pending'
  | 'Verified'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Closed';

export interface AIAnalysisResult {
  title?: string;
  description?: string;
  category?: IssueCategory;
  severity?: IssuePriority;
  suggestedDepartment?: string;
  possibleDuplicatesCount?: number;
  resolutionSummary?: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  imageUrl?: string;
  latitude: number;
  longitude: number;
  address: string;
  priority: IssuePriority;
  status: IssueStatus;
  createdBy: string;
  creatorName: string;
  city?: string;
  ward?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  resolutionDescription?: string;
  upvotesCount: number;
  verificationsCount: number;
  confidenceScore: number;
  aiAnalysis?: AIAnalysisResult;
  createdAt: string;
  updatedAt: string;
  upvotedBy?: string[]; // IDs of users who upvoted
  verifiedBy?: string[]; // IDs of users who verified
}

export interface Comment {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  isVerification: boolean;
  imageUrl?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  relatedIssueId?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  head: string;
}
