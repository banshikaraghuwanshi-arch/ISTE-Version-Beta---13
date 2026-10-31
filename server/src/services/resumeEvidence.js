const escapedRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildResumeEvidence(job, resume) {
  const lines = resume.originalText.split(/\r?\n/);
  const requirements = (job.requiredSkills || []).map((requirement, index) => {
    const matcher = new RegExp(`(^|[^a-z0-9])${escapedRegex(requirement)}(?=$|[^a-z0-9])`, 'i');
    const lineIndex = lines.findIndex(line => matcher.test(line));
    const evidence = lineIndex < 0 ? null : {
      lineStart: lineIndex + 1,
      lineEnd: lineIndex + 1,
      text: lines[lineIndex]
    };
    return {
      id: `requirement-${index + 1}`,
      requirement,
      status: evidence ? 'supported' : 'insufficient-evidence',
      evidence,
      suggestion: evidence
        ? 'Review this exact parsed-resume line and decide whether it supports your experience with this requirement.'
        : 'No matching text was found in the parsed resume. Do not claim this skill without genuine supporting evidence.',
      sourceDocument: resume.fileName
    };
  });

  return {
    isDemo: false,
    evidenceAvailable: requirements.some(requirement => requirement.evidence),
    notice: requirements.length
      ? 'Matches are exact text found in your parsed resume. Page numbers are unavailable in the stored text; line references use the extracted text.'
      : 'This listing has no structured required skills to compare with the parsed resume.',
    job: { id: String(job._id), title: job.title, company: job.companyName },
    resume: { fileName: resume.fileName },
    requirements
  };
}
