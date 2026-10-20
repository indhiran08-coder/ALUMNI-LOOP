-- ====================================================================
-- AlumniLoop — Phase 2: Database Schema, Constraints & RLS Migration
-- Migration: 20261013000001_initial_schema.sql
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM / DOMAIN TYPES (Using text with CHECK constraints for maximum compatibility)

-- 3. PROFILES TABLE
-- Stores public-facing profile information for authenticated users.
-- Administrative privileges are NOT stored here to prevent self-escalation.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    department TEXT NOT NULL,
    graduation_year INTEGER NOT NULL CHECK (graduation_year >= 1970 AND graduation_year <= 2100),
    member_type TEXT NOT NULL CHECK (member_type IN ('student', 'alumni')),
    account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'approved', 'rejected', 'suspended')),
    senior_verified BOOLEAN NOT NULL DEFAULT FALSE,
    company_name TEXT,
    job_role TEXT,
    bio TEXT,
    avatar_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. USER_ROLES TABLE (Dedicated administrative access control)
-- Stores privileged administrative and moderator roles.
-- Strictly isolated from user profile updates.
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role)
);

-- 5. POSTS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) >= 5 AND char_length(title) <= 300),
    body TEXT NOT NULL CHECK (char_length(trim(body)) >= 10),
    post_type TEXT NOT NULL CHECK (post_type IN ('question', 'experience', 'advice', 'resource')),
    category TEXT NOT NULL CHECK (category IN (
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
        'Interview Experiences'
    )),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    upvotes_count INTEGER NOT NULL DEFAULT 0,
    downvotes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. COMMENTS TABLE (Supports nested replies & accepted answers)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(trim(body)) >= 1),
    is_accepted_answer BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Partial unique index to enforce AT MOST ONE accepted answer per post
CREATE UNIQUE INDEX IF NOT EXISTS uq_post_accepted_answer
    ON public.comments (post_id)
    WHERE (is_accepted_answer = TRUE);

-- 7. POST_VOTES TABLE
CREATE TABLE IF NOT EXISTS public.post_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    value INTEGER NOT NULL CHECK (value IN (1, -1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_post_user_vote UNIQUE (post_id, user_id)
);

-- 8. OPPORTUNITIES TABLE (Job, Internship & Referral Board)
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL CHECK (char_length(trim(company_name)) >= 1),
    title TEXT NOT NULL CHECK (char_length(trim(title)) >= 3),
    description TEXT NOT NULL CHECK (char_length(trim(description)) >= 10),
    location TEXT NOT NULL,
    opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('job', 'internship', 'referral')),
    eligibility TEXT NOT NULL,
    application_url TEXT NOT NULL CHECK (application_url ~* '^https?://[^\s/$.?#].[^\s]*$'),
    deadline TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_post_bookmark UNIQUE (user_id, post_id)
);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'comment_reply',
        'post_comment',
        'accepted_answer',
        'upvote_milestone',
        'status_approved',
        'status_rejected',
        'senior_verified',
        'opportunity_posted'
    )),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. REPORTS TABLE (Moderation Queue)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'opportunity', 'user')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 3),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. ADMIN_ACTIONS TABLE (Audit Log)
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'approve_member',
        'reject_member',
        'suspend_member',
        'reinstate_member',
        'verify_senior',
        'revoke_senior',
        'pin_post',
        'unpin_post',
        'delete_post',
        'delete_comment',
        'close_opportunity',
        'resolve_report'
    )),
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type TEXT,
    target_id UUID,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. SENIOR_VERIFICATION_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.senior_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    job_role TEXT NOT NULL,
    proof_type TEXT NOT NULL CHECK (proof_type IN ('offer_letter', 'work_email', 'id_card', 'linkedin')),
    proof_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- 14. INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_senior_verified ON public.profiles(senior_verified);
CREATE INDEX IF NOT EXISTS idx_posts_feed ON public.posts(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_post ON public.post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status_deadline ON public.opportunities(status, deadline ASC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id) WHERE (read_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON public.admin_actions(created_at DESC);

-- ====================================================================
-- 15. SECURITY DEFINER HELPER FUNCTIONS (Prevent RLS Recursion)
-- ====================================================================

-- Check if authenticated user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = check_user_id AND role = 'admin'
    );
$$;

-- Check if user is an approved member
CREATE OR REPLACE FUNCTION public.is_approved(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = check_user_id AND account_status = 'approved'
    );
$$;

-- Check if user is a verified senior or alumni
CREATE OR REPLACE FUNCTION public.is_verified_senior(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = check_user_id AND senior_verified = TRUE AND account_status = 'approved'
    );
$$;

-- Vote count recalculation trigger function
CREATE OR REPLACE FUNCTION public.recalculate_post_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_post_id UUID;
BEGIN
    target_post_id := COALESCE(NEW.post_id, OLD.post_id);
    UPDATE public.posts
    SET upvotes_count = COALESCE((SELECT COUNT(*) FROM public.post_votes WHERE post_id = target_post_id AND value = 1), 0),
        downvotes_count = COALESCE((SELECT COUNT(*) FROM public.post_votes WHERE post_id = target_post_id AND value = -1), 0)
    WHERE id = target_post_id;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_post_votes ON public.post_votes;
CREATE TRIGGER trg_recalculate_post_votes
    AFTER INSERT OR UPDATE OR DELETE ON public.post_votes
    FOR EACH ROW EXECUTE FUNCTION public.recalculate_post_votes();

-- Comments count trigger function
CREATE OR REPLACE FUNCTION public.recalculate_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_post_id UUID;
BEGIN
    target_post_id := COALESCE(NEW.post_id, OLD.post_id);
    UPDATE public.posts
    SET comments_count = COALESCE((SELECT COUNT(*) FROM public.comments WHERE post_id = target_post_id), 0)
    WHERE id = target_post_id;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_comments_count ON public.comments;
CREATE TRIGGER trg_recalculate_comments_count
    AFTER INSERT OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.recalculate_comments_count();

-- ====================================================================
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.senior_verification_requests ENABLE ROW LEVEL SECURITY;

-- --- PROFILES POLICIES ---
-- Approved members and admins can view profiles of approved members. Users can always view their own profile.
CREATE POLICY "profiles_read_approved_or_self"
    ON public.profiles FOR SELECT
    USING (
        id = auth.uid()
        OR public.is_admin()
        OR (account_status = 'approved' AND public.is_approved())
    );

-- Users can insert their own profile upon registration
CREATE POLICY "profiles_insert_self"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- Users can update editable profile fields only.
-- account_status and senior_verified CANNOT be altered by non-admins.
CREATE POLICY "profiles_update_self"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND account_status = (SELECT account_status FROM public.profiles WHERE id = auth.uid())
        AND senior_verified = (SELECT senior_verified FROM public.profiles WHERE id = auth.uid())
    );

-- Admins can update any profile (e.g. approve, reject, suspend, verify senior)
CREATE POLICY "profiles_admin_update"
    ON public.profiles FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- --- USER ROLES POLICIES ---
-- Only administrators can read or modify user_roles
CREATE POLICY "user_roles_admin_read"
    ON public.user_roles FOR SELECT
    USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "user_roles_admin_manage"
    ON public.user_roles FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- --- POSTS POLICIES ---
-- Only approved members or admins can view posts
CREATE POLICY "posts_select_approved"
    ON public.posts FOR SELECT
    USING (public.is_approved() OR public.is_admin());

-- Only approved members can create posts
CREATE POLICY "posts_insert_approved"
    ON public.posts FOR INSERT
    WITH CHECK (
        auth.uid() = author_id
        AND (public.is_approved() OR public.is_admin())
    );

-- Authors can update their own posts, or admins can moderate
CREATE POLICY "posts_update_author_or_admin"
    ON public.posts FOR UPDATE
    USING (
        (auth.uid() = author_id AND public.is_approved())
        OR public.is_admin()
    )
    WITH CHECK (
        (auth.uid() = author_id AND public.is_approved())
        OR public.is_admin()
    );

-- Authors or admins can delete posts
CREATE POLICY "posts_delete_author_or_admin"
    ON public.posts FOR DELETE
    USING (
        (auth.uid() = author_id AND public.is_approved())
        OR public.is_admin()
    );

-- --- COMMENTS POLICIES ---
CREATE POLICY "comments_select_approved"
    ON public.comments FOR SELECT
    USING (public.is_approved() OR public.is_admin());

CREATE POLICY "comments_insert_approved"
    ON public.comments FOR INSERT
    WITH CHECK (
        auth.uid() = author_id
        AND (public.is_approved() OR public.is_admin())
    );

CREATE POLICY "comments_update_author_or_admin"
    ON public.comments FOR UPDATE
    USING (
        (auth.uid() = author_id AND public.is_approved())
        OR public.is_admin()
        OR (
            -- Post author can mark/unmark accepted answer
            EXISTS (
                SELECT 1 FROM public.posts p
                WHERE p.id = comments.post_id AND p.author_id = auth.uid()
            )
        )
    );

CREATE POLICY "comments_delete_author_or_admin"
    ON public.comments FOR DELETE
    USING (
        (auth.uid() = author_id AND public.is_approved())
        OR public.is_admin()
    );

-- --- POST_VOTES POLICIES ---
CREATE POLICY "post_votes_select_approved"
    ON public.post_votes FOR SELECT
    USING (public.is_approved() OR public.is_admin());

CREATE POLICY "post_votes_insert_approved"
    ON public.post_votes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (public.is_approved() OR public.is_admin())
    );

CREATE POLICY "post_votes_update_self"
    ON public.post_votes FOR UPDATE
    USING (auth.uid() = user_id AND public.is_approved())
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

CREATE POLICY "post_votes_delete_self"
    ON public.post_votes FOR DELETE
    USING (auth.uid() = user_id AND public.is_approved());

-- --- OPPORTUNITIES POLICIES ---
CREATE POLICY "opportunities_select_approved"
    ON public.opportunities FOR SELECT
    USING (public.is_approved() OR public.is_admin());

-- Approved seniors, alumni, or admins can publish opportunities
CREATE POLICY "opportunities_insert_approved"
    ON public.opportunities FOR INSERT
    WITH CHECK (
        auth.uid() = author_id
        AND (public.is_verified_senior() OR public.is_admin())
    );

CREATE POLICY "opportunities_update_author_or_admin"
    ON public.opportunities FOR UPDATE
    USING (
        (auth.uid() = author_id AND public.is_approved())
        OR public.is_admin()
    );

CREATE POLICY "opportunities_delete_author_or_admin"
    ON public.opportunities FOR DELETE
    USING (
        (auth.uid() = author_id AND public.is_approved())
        OR public.is_admin()
    );

-- --- BOOKMARKS POLICIES ---
CREATE POLICY "bookmarks_select_own"
    ON public.bookmarks FOR SELECT
    USING (auth.uid() = user_id AND public.is_approved());

CREATE POLICY "bookmarks_insert_own"
    ON public.bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

CREATE POLICY "bookmarks_delete_own"
    ON public.bookmarks FOR DELETE
    USING (auth.uid() = user_id);

-- --- NOTIFICATIONS POLICIES ---
CREATE POLICY "notifications_select_own"
    ON public.notifications FOR SELECT
    USING (auth.uid() = recipient_id);

CREATE POLICY "notifications_update_own"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- --- REPORTS POLICIES ---
CREATE POLICY "reports_insert_approved"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id AND public.is_approved());

CREATE POLICY "reports_admin_select"
    ON public.reports FOR SELECT
    USING (public.is_admin() OR auth.uid() = reporter_id);

CREATE POLICY "reports_admin_update"
    ON public.reports FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- --- ADMIN ACTIONS POLICIES ---
CREATE POLICY "admin_actions_select"
    ON public.admin_actions FOR SELECT
    USING (public.is_admin());

CREATE POLICY "admin_actions_insert"
    ON public.admin_actions FOR INSERT
    WITH CHECK (public.is_admin() AND auth.uid() = admin_id);

-- --- SENIOR VERIFICATION REQUESTS POLICIES ---
CREATE POLICY "senior_requests_select"
    ON public.senior_verification_requests FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "senior_requests_insert"
    ON public.senior_verification_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_approved());

CREATE POLICY "senior_requests_update_admin"
    ON public.senior_verification_requests FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
