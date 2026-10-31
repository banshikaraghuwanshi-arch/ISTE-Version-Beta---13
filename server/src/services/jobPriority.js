export function prioritizeJob({ job, profile, match, status, now = Date.now(), staleAfterDays = 7 }) {
  const interests = [...(profile.preferredRoles || []), ...(profile.interests || [])]
    .map(value => String(value).trim().toLowerCase())
    .filter(Boolean);
  const listingText = `${job.title || ''} ${job.description || ''}`.toLowerCase();
  const interestAlignment = interests.length
    ? interests.some(interest => interest.length >= 3 && listingText.includes(interest)) ? 100 : 0
    : null;
  const experienceSuitability = match.experienceMatch === 'meets-known-years' ? 100
    : match.experienceMatch === 'below-known-years' ? 0 : null;
  const eligibility = match.eligibilityMatch === 'matches-known-authorization' ? 100
    : match.eligibilityMatch === 'does-not-meet-known-authorization' ? 0 : null;
  const verifiedAt = job.lastVerifiedAt ? new Date(job.lastVerifiedAt).getTime() : Number.NaN;
  const verificationFreshness = Number.isFinite(verifiedAt)
    ? Math.max(0, Math.min(100, Math.round(100 * (1 - (now - verifiedAt) / (staleAfterDays * 86400000)))))
    : null;
  const factors = {
    skillMatch: match.skillMatch,
    eligibility,
    experienceSuitability,
    interestAlignment,
    verificationFreshness
  };
  const knownFactors = Object.values(factors).filter(Number.isFinite);
  const score = knownFactors.length
    ? Math.round(knownFactors.reduce((sum, value) => sum + value, 0) / knownFactors.length)
    : null;
  const blocked = ['closed', 'expired'].includes(status) || match.eligibilityMatch === 'does-not-meet-known-authorization';
  const requiresReview = status !== 'active' || knownFactors.length < 2;
  const recommendation = blocked ? 'Skip'
    : requiresReview ? 'Review'
      : score >= 70 ? 'Apply First'
        : 'Consider Later';
  const knownSignalNames = Object.entries(factors)
    .filter(([, value]) => Number.isFinite(value))
    .map(([name]) => name);
  const unknownSignalNames = Object.entries(factors)
    .filter(([, value]) => !Number.isFinite(value))
    .map(([name]) => name);

  return {
    score,
    recommendation,
    confidence: `${knownFactors.length} of ${Object.keys(factors).length} signals available`,
    factors,
    estimatedMinutes: null,
    explanation: blocked
      ? 'A closed, expired, or known-ineligible listing cannot be promoted by a high skill score.'
      : `Priority averages the available signals (${knownSignalNames.join(', ') || 'none'}); unavailable signals (${unknownSignalNames.join(', ') || 'none'}) are not guessed. Application effort is not provided by the listing.`
  };
}
