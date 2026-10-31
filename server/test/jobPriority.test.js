import test from 'node:test';
import assert from 'node:assert/strict';
import { prioritizeJob } from '../src/services/jobPriority.js';

const unknownMatch = {
  skillMatch: null,
  experienceMatch: 'unknown',
  eligibilityMatch: 'unknown'
};

test('job priority leaves unavailable signals and application effort unknown', () => {
  const result = prioritizeJob({
    job: { title: 'Engineer', description: '' },
    profile: {},
    match: unknownMatch,
    status: 'active'
  });

  assert.equal(result.score, null);
  assert.equal(result.recommendation, 'Review');
  assert.equal(result.estimatedMinutes, null);
  assert.equal(result.confidence, '0 of 5 signals available');
  assert.match(result.explanation, /not guessed/);
});

test('job priority averages known signals and skips closed or ineligible jobs', () => {
  const active = prioritizeJob({
    job: { title: 'React Engineer', lastVerifiedAt: new Date(1000) },
    profile: { preferredRoles: ['React'] },
    match: { skillMatch: 80, experienceMatch: 'meets-known-years', eligibilityMatch: 'unknown' },
    status: 'active',
    now: 1000
  });
  const closed = prioritizeJob({
    job: { title: 'React Engineer' },
    profile: {},
    match: { ...unknownMatch, eligibilityMatch: 'does-not-meet-known-authorization' },
    status: 'closed',
    now: 1000
  });

  assert.equal(active.score, 95);
  assert.equal(active.recommendation, 'Apply First');
  assert.equal(closed.score, 0);
  assert.equal(closed.recommendation, 'Skip');
});
