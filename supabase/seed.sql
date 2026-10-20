-- ====================================================================
-- AlumniLoop — Development Seed Data
-- File: supabase/seed.sql
-- ====================================================================

-- 1. Create simulated auth users (for local development or seeded environments)
-- Note: In production Supabase, users register via auth.signUp.

-- User UUIDs:
-- Admin:    00000000-0000-0000-0000-000000000001
-- Senior 1: 00000000-0000-0000-0000-000000000002 (Google)
-- Senior 2: 00000000-0000-0000-0000-000000000003 (Microsoft)
-- Student:  00000000-0000-0000-0000-000000000004 (CSE 3rd Year)
-- Pending:  00000000-0000-0000-0000-000000000005 (Pending Approval)

INSERT INTO public.profiles (id, full_name, department, graduation_year, member_type, account_status, senior_verified, company_name, job_role, bio)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Prof. Ramesh Sharma',
    'Computer Science & Engineering',
    2012,
    'alumni',
    'approved',
    TRUE,
    'College Placement Cell',
    'Faculty Coordinator & Admin',
    'Overseeing campus placements and fostering alumni-student mentorship networks.'
),
(
    '00000000-0000-0000-0000-000000000002',
    'Ananya Iyer',
    'Computer Science & Engineering',
    2024,
    'alumni',
    'approved',
    TRUE,
    'Google',
    'Software Engineer',
    'Placed at Google (L3) via on-campus recruitment. Excited to help juniors with DSA and system design.'
),
(
    '00000000-0000-0000-0000-000000000003',
    'Rohan Mehta',
    'Information Technology',
    2025,
    'student',
    'approved',
    TRUE,
    'Microsoft',
    'Incoming Software Engineer Intern',
    'Summer intern at Microsoft IDC. Passionate about distributed systems, backend engineering, and open source.'
),
(
    '00000000-0000-0000-0000-000000000004',
    'Sneha Patel',
    'Computer Science & Engineering',
    2027,
    'student',
    'approved',
    FALSE,
    NULL,
    'Pre-final Year Student',
    'Curious learner prepping for summer 2027 internship drives. Focusing on Graph algorithms and Web dev.'
),
(
    '00000000-0000-0000-0000-000000000005',
    'Devika Nair',
    'Electronics & Communication',
    2027,
    'student',
    'pending',
    FALSE,
    NULL,
    'Aspiring Firmware Engineer',
    'Registered student awaiting administrator verification.'
)
ON CONFLICT (id) DO NOTHING;

-- 2. User Roles (Designate Admin)
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT DO NOTHING;

-- 3. Seed Posts
INSERT INTO public.posts (id, author_id, title, body, post_type, category, is_pinned, upvotes_count, downvotes_count, comments_count)
VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Comprehensive Google On-Campus Interview Experience (SDE L3) — 2024 Batch',
    E'Hey everyone! I wanted to document my entire Google placement journey to demystify the rounds and give you a structured timeline:\n\n### Round 1: Online Assessment (OA)\n- 2 questions on HackerEarth (90 mins). First was a Greedy + Priority Queue problem, second was a Dynamic Programming on Trees question.\n- Tip: Make sure your edge cases (empty arrays, boundary integers) are thoroughly checked before submitting.\n\n### Round 2: Technical Interview 1 (Data Structures)\n- Problem focused on sliding window with variable constraint. Started with brute force O(N^2), then optimized to O(N) using Monotonic Queue.\n- The interviewer was super collaborative. Speak your thoughts aloud continuously!\n\n### Round 3: Technical Interview 2 (Algorithms & Graphs)\n- Variation of Dijkstra with multi-state shortest path. We discussed time and space trade-offs in detail.\n\n### Round 4: Googleyness & Leadership\n- Behavioral questions focused on handling disagreements during college group projects and navigating ambiguous requirements.\n\nPreparation Strategy: Consistency matters much more than cramming. Practice 2 LeetCode mediums daily with a 35-minute timer.',
    'experience',
    'Interview Experiences',
    TRUE,
    42,
    0,
    3
),
(
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004',
    'How should a 3rd-year junior balance DSA and Development projects for on-campus drives?',
    E'I am currently entering my 6th semester and feeling overwhelmed trying to divide time between solving LeetCode problems and building full-stack projects for my resume.\n\nShould I dedicate 80% of my time to DSA right now, or will companies reject resumes that lack production-grade deployed projects? Would love advice from placed seniors!',
    'question',
    'Placement Preparation',
    FALSE,
    18,
    0,
    2
),
(
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'Curated Roadmap: Cracking Microsoft Summer Internships (Resume to Final Round)',
    E'Microsoft on-campus hiring tends to reward clean, bug-free modular code and strong core CS fundamentals (OS, DBMS, Networks).\n\nKey areas to master:\n1. Trees, Binary Search Trees, and Heaps.\n2. Operating Systems: Multi-threading, Synchronization primitives, Virtual Memory.\n3. Resume tip: Quantify your project metrics (e.g., "Reduced latency by 35% through Redis caching").',
    'advice',
    'Internships',
    FALSE,
    29,
    1,
    1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Comments (with accepted answer)
INSERT INTO public.comments (id, post_id, author_id, parent_comment_id, body, is_accepted_answer)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    NULL,
    E'Here is the golden rule for on-campus rounds: DSA clears the gateway rounds (OA and Round 1), while projects and core subjects win the interview.\n\nA great split right now is: 65% DSA (2-3 focused problems daily), 25% deep-diving into 1-2 solid, deployed projects (know every line of architecture), and 10% CS fundamentals (OS, DBMS). Quality of 1 deployed project beats 5 clone tutorials every single time!',
    TRUE
),
(
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000001',
    'Thank you so much Ananya di! Marking this as the accepted answer. This gives me huge clarity on how to plan my schedule.',
    FALSE
),
(
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    NULL,
    'Tremendous breakdown! The emphasis on speaking aloud during coding is 100% accurate. Interviewers want to see how you troubleshoot when you get stuck.',
    FALSE
)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Opportunities
INSERT INTO public.opportunities (id, author_id, company_name, title, description, location, opportunity_type, eligibility, application_url, deadline, status)
VALUES
(
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Google',
    'Software Engineering Intern — Summer 2027',
    'Join Google engineering teams to build scalable infrastructure, cloud services, and user-facing applications. 10-12 week paid summer internship.',
    'Bengaluru / Hyderabad, India (Hybrid)',
    'internship',
    'B.Tech / M.Tech students graduating in 2027. CGPA 7.5+ preferred. Proficiency in C++, Java, or Go.',
    'https://careers.google.com/jobs/results/intern-swe',
    timezone('utc'::text, now() + interval '30 days'),
    'open'
),
(
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    'Microsoft',
    'Alumni Referral — Software Engineer (Cloud + AI)',
    'I can refer 3-4 final year batchmates or recent alumni with strong Distributed Systems and Azure/C# or Go backgrounds. Send me your resume and LeetCode profile.',
    'Hyderabad / Noida, India',
    'referral',
    'Graduation 2025 or 2026. Strong foundation in Algorithms, OS, and REST APIs.',
    'https://careers.microsoft.com/professionals/us/en/job/1802938',
    timezone('utc'::text, now() + interval '14 days'),
    'open'
)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Senior Verification Requests
INSERT INTO public.senior_verification_requests (id, user_id, company_name, job_role, proof_type, proof_url, notes, status)
VALUES
(
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004',
    'Amazon',
    'Incoming SDE Intern',
    'offer_letter',
    'https://example-college.edu/documents/offer-letter-sample.pdf',
    'Received on-campus offer for 6-month winter internship at Amazon BLR.',
    'pending'
)
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Admin Action Audit Log
INSERT INTO public.admin_actions (id, admin_id, action_type, target_user_id, target_type, target_id, reason)
VALUES
(
    '50000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'approve_member',
    '00000000-0000-0000-0000-000000000002',
    'profile',
    '00000000-0000-0000-0000-000000000002',
    'Verified college alumni email and Google placement records.'
),
(
    '50000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'verify_senior',
    '00000000-0000-0000-0000-000000000002',
    'profile',
    '00000000-0000-0000-0000-000000000002',
    'Verified placement records with Google campus recruitment team.'
)
ON CONFLICT (id) DO NOTHING;
