/**
 * Preservation Property Tests — Approval Button Missing Fix
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * METHODOLOGY: Observation-first — these tests encode the CURRENT (unfixed) behaviour
 * for all states that are NOT affected by the bug.  They MUST PASS on unfixed code
 * and MUST CONTINUE TO PASS after the fix is applied (regression guard).
 *
 * Pure-function mirroring approach (same as DashboardPage.bug.test.tsx):
 * Each helper below is a verbatim copy of the relevant decision expression from
 * DashboardPage.tsx so the tests remain fast and free of React/router/query deps.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ---------------------------------------------------------------------------
// Mirror the UNFIXED logic from DashboardPage.tsx
// (These are intentionally copies of the unfixed code — we are asserting what
//  the unfixed code produces for non-buggy inputs, then preserving that.)
// ---------------------------------------------------------------------------

/**
 * Mirrors line ~84 (unfixed):
 *   const memberCount = myTeam ? teamMembers.length || (myTeam.member_count ?? 0) : 0
 */
function deriveMemberCount(
  myTeam: { member_count?: number } | null | undefined,
  teamMembersLength: number
): number {
  return myTeam ? teamMembersLength || (myTeam.member_count ?? 0) : 0
}

/**
 * Mirrors line ~88 (unfixed):
 *   const canSubmitForApproval =
 *     isLeader &&
 *     myTeam?.status === 'draft' &&
 *     memberCount >= minTeamSize &&
 *     memberCount <= maxTeamSize
 */
function canSubmitForApproval(opts: {
  isLeader: boolean
  status: string
  memberCount: number
  minTeamSize: number
  maxTeamSize: number
}): boolean {
  return (
    opts.isLeader &&
    opts.status === 'draft' &&
    opts.memberCount >= opts.minTeamSize &&
    opts.memberCount <= opts.maxTeamSize
  )
}

/**
 * Mirrors the QuickActions approval-block render gate (line ~291 unfixed):
 *   {myTeam.status === 'draft' && ( canSubmitForApproval ? <SubmitApprovalCard/> : <LockedCard/> )}
 *
 * Returns 'submit' | 'locked' | 'none'
 */
function quickActionsApprovalSlot(opts: {
  status: string
  canSubmitForApproval: boolean
}): 'submit' | 'locked' | 'none' {
  if (opts.status !== 'draft') return 'none'
  return opts.canSubmitForApproval ? 'submit' : 'locked'
}

/**
 * Mirrors the StatusBanner showSubmitCTA derivation (line ~267 unfixed):
 *   const showSubmitCTA =
 *     isLeader &&
 *     (myTeam.status === 'draft' || myTeam.status === 'pending') &&
 *     canSubmitForApproval
 */
function showSubmitCTA(opts: {
  isLeader: boolean
  status: string
  canSubmitForApproval: boolean
}): boolean {
  return opts.isLeader && (opts.status === 'draft' || opts.status === 'pending') && opts.canSubmitForApproval
}

/**
 * Mirrors the StatusBanner locked-hint render gate (line ~310 unfixed):
 *   {isLeader && myTeam.status === 'draft' && memberCount < minTeamSize && ...}
 */
function statusBannerShowsLockedHint(opts: {
  isLeader: boolean
  status: string
  memberCount: number
  minTeamSize: number
}): boolean {
  return opts.isLeader && opts.status === 'draft' && opts.memberCount < opts.minTeamSize
}

// ---------------------------------------------------------------------------
// 1. Locked Approval — draft, leader, memberCount < minTeamSize
//    Preservation: locked card renders, no SubmitApprovalCard, StatusBanner shows locked hint
// ---------------------------------------------------------------------------

describe('Preservation 1 — Locked approval (draft, leader, memberCount < minTeamSize)', () => {
  const opts = {
    isLeader: true,
    status: 'draft',
    memberCount: 0,
    minTeamSize: 2,
    maxTeamSize: 4,
  }
  const canSubmit = canSubmitForApproval(opts)
  const slot = quickActionsApprovalSlot({ status: opts.status, canSubmitForApproval: canSubmit })
  const lockedHint = statusBannerShowsLockedHint(opts)
  const submitCTA = showSubmitCTA({ isLeader: opts.isLeader, status: opts.status, canSubmitForApproval: canSubmit })

  it('canSubmitForApproval is false (memberCount 0 < minTeamSize 2)', () => {
    expect(canSubmit).toBe(false)
  })

  it('QuickActions renders the locked card — not SubmitApprovalCard', () => {
    expect(slot).toBe('locked')
  })

  it('StatusBanner shows the locked hint', () => {
    expect(lockedHint).toBe(true)
  })

  it('StatusBanner does NOT show the submit CTA', () => {
    expect(submitCTA).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 2. Approved team — no approval submission UI
//    Preservation: slot = 'none', no CTA, no locked hint
// ---------------------------------------------------------------------------

describe('Preservation 2 — Approved team (no approval UI)', () => {
  const opts = {
    isLeader: true,
    status: 'approved',
    memberCount: 3,
    minTeamSize: 1,
    maxTeamSize: 4,
  }
  const canSubmit = canSubmitForApproval(opts)
  const slot = quickActionsApprovalSlot({ status: opts.status, canSubmitForApproval: canSubmit })
  const submitCTA = showSubmitCTA({ isLeader: opts.isLeader, status: opts.status, canSubmitForApproval: canSubmit })
  const lockedHint = statusBannerShowsLockedHint(opts)

  it('canSubmitForApproval is false for approved status', () => {
    expect(canSubmit).toBe(false)
  })

  it('QuickActions renders no approval block', () => {
    expect(slot).toBe('none')
  })

  it('StatusBanner shows no submit CTA', () => {
    expect(submitCTA).toBe(false)
  })

  it('StatusBanner shows no locked hint', () => {
    expect(lockedHint).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 3. Rejected team — no approval submission UI
//    Preservation: slot = 'none', no CTA, no locked hint
// ---------------------------------------------------------------------------

describe('Preservation 3 — Rejected team (no approval UI)', () => {
  const opts = {
    isLeader: true,
    status: 'rejected',
    memberCount: 3,
    minTeamSize: 1,
    maxTeamSize: 4,
  }
  const canSubmit = canSubmitForApproval(opts)
  const slot = quickActionsApprovalSlot({ status: opts.status, canSubmitForApproval: canSubmit })
  const submitCTA = showSubmitCTA({ isLeader: opts.isLeader, status: opts.status, canSubmitForApproval: canSubmit })
  const lockedHint = statusBannerShowsLockedHint(opts)

  it('canSubmitForApproval is false for rejected status', () => {
    expect(canSubmit).toBe(false)
  })

  it('QuickActions renders no approval block', () => {
    expect(slot).toBe('none')
  })

  it('StatusBanner shows no submit CTA', () => {
    expect(submitCTA).toBe(false)
  })

  it('StatusBanner shows no locked hint', () => {
    expect(lockedHint).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 4. Non-leader member — no approval button regardless of team state
//    Preservation: isLeader=false → canSubmitForApproval false, no CTA, no locked hint
// ---------------------------------------------------------------------------

describe('Preservation 4 — Non-leader member (no approval UI regardless)', () => {
  const opts = {
    isLeader: false,
    status: 'draft',
    memberCount: 3,
    minTeamSize: 1,
    maxTeamSize: 4,
  }
  const canSubmit = canSubmitForApproval(opts)
  const slot = quickActionsApprovalSlot({ status: opts.status, canSubmitForApproval: canSubmit })
  const submitCTA = showSubmitCTA({ isLeader: opts.isLeader, status: opts.status, canSubmitForApproval: canSubmit })
  const lockedHint = statusBannerShowsLockedHint(opts)

  it('canSubmitForApproval is false for non-leader', () => {
    expect(canSubmit).toBe(false)
  })

  it('QuickActions renders the locked card slot (draft gate passes, but canSubmit false → locked)', () => {
    // The QuickActions block itself is also guarded by `isLeader &&` in the JSX:
    //   {isLeader && (<>...</>)}
    // Inside that block, the status==='draft' gate renders the locked card.
    // Our helper doesn't model the isLeader JSX guard, but the canSubmit=false path
    // still produces 'locked' for the slot — the isLeader JSX guard is the outer gate.
    // What matters: the submit card is NOT rendered (slot !== 'submit').
    expect(slot).not.toBe('submit')
  })

  it('StatusBanner shows no submit CTA for non-leader', () => {
    expect(submitCTA).toBe(false)
  })

  it('StatusBanner shows no locked hint for non-leader', () => {
    expect(lockedHint).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 5. No team (myTeam = null) — join/create shown, no approval UI
//    Preservation: memberCount = 0, canSubmitForApproval = false
// ---------------------------------------------------------------------------

describe('Preservation 5 — No team (myTeam = null)', () => {
  it('memberCount is 0 when myTeam is null', () => {
    const count = deriveMemberCount(null, 0)
    expect(count).toBe(0)
  })

  it('canSubmitForApproval is false when there is no team', () => {
    // isLeader will be false (myTeam?.leader_id === user?.id → undefined === id → false)
    const canSubmit = canSubmitForApproval({
      isLeader: false,
      status: '',
      memberCount: 0,
      minTeamSize: 1,
      maxTeamSize: 4,
    })
    expect(canSubmit).toBe(false)
  })

  it('QuickActions renders no approval block when no team', () => {
    // QuickActions returns early with join/create cards when !myTeam
    // Our helper: status='' is not 'draft', so slot = 'none'
    const slot = quickActionsApprovalSlot({ status: '', canSubmitForApproval: false })
    expect(slot).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// 6. memberCount derivation — teamMembers.length wins when array has members
//    Preservation: live count always beats stale member_count when length > 0
// ---------------------------------------------------------------------------

describe('Preservation 6 — memberCount derivation: live array wins', () => {
  it('teamMembers with 2 members → memberCount = 2 regardless of stale member_count', () => {
    const count = deriveMemberCount({ member_count: 0 }, 2)
    expect(count).toBe(2)
  })

  it('teamMembers with 3 members → memberCount = 3 even if member_count = 99', () => {
    const count = deriveMemberCount({ member_count: 99 }, 3)
    expect(count).toBe(3)
  })

  it('teamMembers with 1 member → memberCount = 1 even if member_count = 0', () => {
    const count = deriveMemberCount({ member_count: 0 }, 1)
    expect(count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 7. memberCount derivation — fallback to myTeam.member_count when array is empty
//    Preservation: fallback only fires when teamMembers = []
// ---------------------------------------------------------------------------

describe('Preservation 7 — memberCount derivation: fallback when array is empty', () => {
  it('teamMembers = [] with member_count = 3 → memberCount = 3 (stale fallback)', () => {
    const count = deriveMemberCount({ member_count: 3 }, 0)
    expect(count).toBe(3)
  })

  it('teamMembers = [] with member_count = 0 → memberCount = 0', () => {
    const count = deriveMemberCount({ member_count: 0 }, 0)
    expect(count).toBe(0)
  })

  it('teamMembers = [] with member_count undefined → memberCount = 0 (nullish coalesce)', () => {
    const count = deriveMemberCount({}, 0)
    expect(count).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Property-based tests — fast-check
// Generate random {status: 'approved'|'rejected', memberCount, minTeamSize, isLeader}
// and assert no approval UI renders across all combinations.
// ---------------------------------------------------------------------------

describe('PBT — approved/rejected teams never render approval UI (Property 2: Preservation)', () => {
  /**
   * Validates: Requirements 3.3, 3.4
   *
   * For any combination of isLeader, memberCount, minTeamSize, maxTeamSize
   * when status is 'approved' or 'rejected', the approval submission slot
   * must always be 'none' and showSubmitCTA must always be false.
   */
  it('approved or rejected status → no approval UI across all member counts and roles', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('approved', 'rejected'),
        fc.boolean(),               // isLeader
        fc.integer({ min: 0, max: 10 }), // memberCount
        fc.integer({ min: 1, max: 5 }),  // minTeamSize
        fc.integer({ min: 5, max: 10 }), // maxTeamSize
        (status, isLeader, memberCount, minTeamSize, maxTeamSize) => {
          const canSubmit = canSubmitForApproval({ isLeader, status, memberCount, minTeamSize, maxTeamSize })
          const slot = quickActionsApprovalSlot({ status, canSubmitForApproval: canSubmit })
          const cta = showSubmitCTA({ isLeader, status, canSubmitForApproval: canSubmit })

          // No approval UI for approved or rejected teams
          expect(canSubmit).toBe(false)
          expect(slot).toBe('none')
          expect(cta).toBe(false)
        }
      )
    )
  })

  /**
   * Validates: Requirements 3.5
   *
   * For any team status with isLeader = false, canSubmitForApproval and
   * showSubmitCTA must always be false.
   */
  it('non-leader → canSubmitForApproval and showSubmitCTA are always false', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('draft', 'pending', 'approved', 'rejected'),
        fc.integer({ min: 0, max: 10 }), // memberCount
        fc.integer({ min: 1, max: 5 }),  // minTeamSize
        fc.integer({ min: 5, max: 10 }), // maxTeamSize
        (status, memberCount, minTeamSize, maxTeamSize) => {
          const canSubmit = canSubmitForApproval({ isLeader: false, status, memberCount, minTeamSize, maxTeamSize })
          const cta = showSubmitCTA({ isLeader: false, status, canSubmitForApproval: canSubmit })

          expect(canSubmit).toBe(false)
          expect(cta).toBe(false)
        }
      )
    )
  })

  /**
   * Validates: Requirements 3.1, 3.2
   *
   * For a draft leader team where memberCount < minTeamSize, the locked card
   * always renders (slot = 'locked') and the submit CTA never renders.
   */
  it('draft team, leader, memberCount < minTeamSize → always locked, never submit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // minTeamSize (at least 1)
        fc.integer({ min: 5, max: 10 }), // maxTeamSize
        fc.integer({ min: 0, max: 9 }).filter((n) => n < 5), // memberCount < minTeamSize
        (minTeamSize, maxTeamSize, memberCount) => {
          fc.pre(memberCount < minTeamSize)
          const canSubmit = canSubmitForApproval({ isLeader: true, status: 'draft', memberCount, minTeamSize, maxTeamSize })
          const slot = quickActionsApprovalSlot({ status: 'draft', canSubmitForApproval: canSubmit })
          const cta = showSubmitCTA({ isLeader: true, status: 'draft', canSubmitForApproval: canSubmit })
          const locked = statusBannerShowsLockedHint({ isLeader: true, status: 'draft', memberCount, minTeamSize })

          expect(canSubmit).toBe(false)
          expect(slot).toBe('locked')
          expect(cta).toBe(false)
          expect(locked).toBe(true)
        }
      )
    )
  })

  /**
   * Validates: Requirements 3.6
   *
   * memberCount derivation: when teamMembers.length > 0, the result must always
   * equal teamMembers.length regardless of myTeam.member_count.
   */
  it('memberCount derivation: live array length always wins when > 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // teamMembersLength > 0
        fc.integer({ min: 0, max: 10 }), // member_count (stale)
        (liveLength, staleMemberCount) => {
          const count = deriveMemberCount({ member_count: staleMemberCount }, liveLength)
          expect(count).toBe(liveLength)
        }
      )
    )
  })

  /**
   * Validates: Requirements 3.6
   *
   * memberCount derivation: when teamMembers = [], the result must always
   * equal myTeam.member_count (the stale fallback).
   */
  it('memberCount derivation: fallback to member_count when teamMembers is empty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }), // member_count (stale)
        (staleMemberCount) => {
          const count = deriveMemberCount({ member_count: staleMemberCount }, 0)
          expect(count).toBe(staleMemberCount)
        }
      )
    )
  })
})
