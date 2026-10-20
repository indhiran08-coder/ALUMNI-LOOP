// ====================================================================
// AlumniLoop — Database & Application Types
// File: src/types/database.types.ts
// ====================================================================

export type MemberType = 'student' | 'alumni'
export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type UserRoleType = 'admin' | 'moderator'
export type PostType = 'question' | 'experience' | 'advice' | 'resource'
export type OpportunityType = 'job' | 'internship' | 'referral'
export type OpportunityStatus = 'open' | 'closed' | 'expired'
export type ReportTargetType = 'post' | 'comment' | 'opportunity' | 'user'
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned'
export type SeniorVerificationStatus = 'pending' | 'approved' | 'rejected'
export type ProofType = 'offer_letter' | 'work_email' | 'id_card' | 'linkedin'

export type PostCategory =
  | 'Placement Preparation'
  | 'Aptitude'
  | 'Data Structures and Algorithms'
  | 'Technical Interviews'
  | 'HR Interviews'
  | 'Resume and LinkedIn'
  | 'Projects and Portfolios'
  | 'Internships'
  | 'Job Opportunities'
  | 'Higher Studies'
  | 'Career Guidance'
  | 'Interview Experiences'

export const POST_CATEGORIES: PostCategory[] = [
  'Placement Preparation',
  'Aptitude',
  'Data Structures and Algorithms',
  'Technical Interviews',
  'HR Interviews',
  'Resume and LinkedIn',
  'Projects and Portfolios',
  'Internships',
  'Job Opportunities',
  'Higher Studies',
  'Career Guidance',
  'Interview Experiences',
]

export interface Profile {
  id: string
  full_name: string
  department: string
  graduation_year: number
  member_type: MemberType
  account_status: AccountStatus
  senior_verified: boolean
  company_name: string | null
  job_role: string | null
  bio: string | null
  avatar_path: string | null
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role: UserRoleType
  granted_at: string
  granted_by: string | null
}

export interface Post {
  id: string
  author_id: string
  title: string
  body: string
  image_url?: string | null
  post_type: PostType
  category: PostCategory
  is_pinned: boolean
  upvotes_count: number
  downvotes_count: number
  comments_count: number
  created_at: string
  updated_at: string
  // Populated relationships
  author?: Profile
  user_vote?: number // 1, -1, or 0
  is_bookmarked?: boolean
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  parent_comment_id: string | null
  body: string
  is_accepted_answer: boolean
  created_at: string
  updated_at: string
  // Populated relationships
  author?: Profile
  replies?: Comment[]
}

export interface PostVote {
  id: string
  post_id: string
  user_id: string
  value: 1 | -1
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: string
  author_id: string
  company_name: string
  title: string
  description: string
  location: string
  opportunity_type: OpportunityType
  eligibility: string
  application_url: string
  deadline: string | null
  status: OpportunityStatus
  created_at: string
  updated_at: string
  // Populated relationships
  author?: Profile
}

export interface Bookmark {
  id: string
  user_id: string
  post_id: string
  created_at: string
  post?: Post
}

export interface Notification {
  id: string
  recipient_id: string
  actor_id: string | null
  event_type:
    | 'comment_reply'
    | 'post_comment'
    | 'accepted_answer'
    | 'upvote_milestone'
    | 'status_approved'
    | 'status_rejected'
    | 'senior_verified'
    | 'opportunity_posted'
  post_id: string | null
  comment_id: string | null
  message: string
  read_at: string | null
  created_at: string
  actor?: Profile
}

export interface Report {
  id: string
  reporter_id: string
  target_type: ReportTargetType
  target_id: string
  reason: string
  details: string | null
  status: ReportStatus
  reviewed_by: string | null
  created_at: string
  updated_at: string
  reporter?: Profile
}

export interface AdminAction {
  id: string
  admin_id: string
  action_type: string
  target_user_id: string | null
  target_type: string | null
  target_id: string | null
  reason: string | null
  created_at: string
  admin?: Profile
  target_user?: Profile
}

export interface SeniorVerificationRequest {
  id: string
  user_id: string
  company_name: string
  job_role: string
  proof_type: ProofType
  proof_url: string | null
  notes: string | null
  status: SeniorVerificationStatus
  reviewed_by: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  user?: Profile
}
