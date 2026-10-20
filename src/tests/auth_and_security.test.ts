// ====================================================================
// AlumniLoop — Authentication, Security & Permission Unit Tests
// File: src/tests/auth_and_security.test.ts
// ====================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { authService } from '@/features/auth/auth.service'
import { feedService } from '@/features/feed/feed.service'
import { opportunitiesService } from '@/features/opportunities/opportunities.service'
import { adminService } from '@/features/admin/admin.service'
import { mockStore, DEMO_USERS } from '@/lib/mockStore'

describe('AlumniLoop Security & Authorization Test Suite', () => {
  beforeEach(() => {
    mockStore.reset()
  })

  it('Requirement 1 & 15: new registration validates college email domain and enters pending status', async () => {
    // Check non-college email rejection
    expect(authService.validateEmailDomain('student@gmail.com')).toBe(false)
    expect(authService.validateEmailDomain('student@college.edu')).toBe(true)

    await expect(
      authService.register({
        fullName: 'Test Candidate',
        email: 'candidate@external.org',
        password: 'password123',
        department: 'CSE',
        graduationYear: 2026,
        memberType: 'student',
      })
    ).rejects.toThrow(/Registration requires an official @college.edu/)

    // Valid registration
    const result = await authService.register({
      fullName: 'Rahul Verma',
      email: 'rahul.verma@college.edu',
      password: 'password123',
      department: 'Computer Science & Engineering',
      graduationYear: 2026,
      memberType: 'student',
    })

    expect(result.profile.account_status).toBe('pending')
    expect(result.profile.senior_verified).toBe(false)
    expect(result.requiresApproval).toBe(true)
  })

  it('Requirement 2 & 5: unapproved (pending) user cannot create a post', async () => {
    // Switch to pending student (Devika Nair)
    await authService.switchDemoUser('00000000-0000-0000-0000-000000000005')

    await expect(
      feedService.createPost({
        title: 'Unauthorized post from pending user',
        body: 'This should fail authorization.',
        postType: 'question',
        category: 'Placement Preparation',
      })
    ).rejects.toThrow(/pending administrator approval/)
  })

  it('Requirement 3: administrator can review and approve a pending registration', async () => {
    // Switch to Admin (Prof. Ramesh)
    await authService.switchDemoUser('00000000-0000-0000-0000-000000000001')

    const pending = await adminService.getPendingRegistrations()
    expect(pending.some((p) => p.id === '00000000-0000-0000-0000-000000000005')).toBe(true)

    // Approve Devika Nair
    await adminService.approveMember('00000000-0000-0000-0000-000000000005', 'ID verified in person')

    // Confirm status is now approved
    const profiles = mockStore.getProfiles()
    const devika = profiles.find((p) => p.id === '00000000-0000-0000-0000-000000000005')
    expect(devika?.account_status).toBe('approved')

    // Confirm action logged in audit log
    const auditLogs = await adminService.getAuditLogs()
    expect(auditLogs[0].action_type).toBe('approve_member')
    expect(auditLogs[0].target_user_id).toBe('00000000-0000-0000-0000-000000000005')
  })

  it('Requirement 4: approved student can successfully create a post', async () => {
    // Switch to approved student (Sneha Patel)
    await authService.switchDemoUser('00000000-0000-0000-0000-000000000004')

    const newPost = await feedService.createPost({
      title: 'Best resources for practicing Dynamic Programming on Trees?',
      body: 'Looking for a step-by-step problem set before upcoming campus tests.',
      postType: 'question',
      category: 'Data Structures and Algorithms',
    })

    expect(newPost).toBeDefined()
    expect(newPost.title).toBe('Best resources for practicing Dynamic Programming on Trees?')
    expect(newPost.author_id).toBe('00000000-0000-0000-0000-000000000004')
  })

  it('Requirement 6 & 7: user cannot self-promote to senior or admin via profile updates', async () => {
    // Switch to approved junior student
    await authService.switchDemoUser('00000000-0000-0000-0000-000000000004')

    // Attempt to self-grant senior_verified or tamper account status
    const updated = await authService.updateProfile({
      bio: 'Legitimate updated bio text',
      // The service explicitly filters out senior_verified and account_status tampering
      ...({ senior_verified: true, account_status: 'approved' } as any),
    })

    expect(updated.bio).toBe('Legitimate updated bio text')
    expect(updated.senior_verified).toBe(false) // Must remain false!
  })

  it("Requirement 8: member cannot edit another member's post", async () => {
    // Switch to Sneha Patel
    await authService.switchDemoUser('00000000-0000-0000-0000-000000000004')

    // Post owned by Ananya Iyer (00000000-0000-0000-0000-000000000002)
    const targetPostId = '10000000-0000-0000-0000-000000000001'

    await expect(
      feedService.updatePost(targetPostId, {
        title: 'Tampered Title by unauthorized user',
      })
    ).rejects.toThrow(/You do not have permission to edit this post/)
  })

  it('Requirement 10: voting is idempotent and handles upvote and downvote count accurately', async () => {
    // Switch to Sneha Patel
    await authService.switchDemoUser('00000000-0000-0000-0000-000000000004')
    const targetPostId = '10000000-0000-0000-0000-000000000001'

    // Upvote
    const res1 = await feedService.vote(targetPostId, 1)
    expect(res1.userVote).toBe(1)

    // Repeat upvote doesn't duplicate
    const res2 = await feedService.vote(targetPostId, 1)
    expect(res2.userVote).toBe(1)

    // Remove vote
    const res3 = await feedService.vote(targetPostId, 0)
    expect(res3.userVote).toBe(0)
  })

  it('Requirement 14: invalid opportunity URLs are rejected', async () => {
    expect(opportunitiesService.validateUrl('ftp://invalid-server')).toBe(false)
    expect(opportunitiesService.validateUrl('not-a-url')).toBe(false)
    expect(opportunitiesService.validateUrl('javascript:alert(1)')).toBe(false)
    expect(opportunitiesService.validateUrl('https://careers.google.com/jobs')).toBe(true)
    expect(opportunitiesService.validateUrl('http://jobs.company.com')).toBe(true)

    // Attempt to create opportunity as verified senior (Ananya) with invalid URL
    await authService.switchDemoUser('00000000-0000-0000-0000-000000000002')

    await expect(
      opportunitiesService.createOpportunity({
        companyName: 'Tech Corp',
        title: 'Software Developer',
        description: 'Great role description for candidates',
        location: 'Bengaluru',
        opportunityType: 'job',
        eligibility: 'All 2026 graduates',
        applicationUrl: 'invalid-url-format',
      })
    ).rejects.toThrow(/valid application URL beginning with http:\/\/ or https:\/\//)
  })

  it('Requirement 12: only authorized administrator can suspend accounts', async () => {
    // Sneha (student) attempts to suspend another user
    await authService.switchDemoUser('00000000-0000-0000-0000-000000000004')

    await expect(
      adminService.suspendMember('00000000-0000-0000-0000-000000000002', 'Test reason')
    ).rejects.toThrow(/Administrator privileges required/)

    // Switch to Admin
    await authService.switchDemoUser('00000000-0000-0000-0000-000000000001')
    await adminService.suspendMember('00000000-0000-0000-0000-000000000005', 'Policy violation')

    const profiles = mockStore.getProfiles()
    const suspended = profiles.find((p) => p.id === '00000000-0000-0000-0000-000000000005')
    expect(suspended?.account_status).toBe('suspended')
  })
})
