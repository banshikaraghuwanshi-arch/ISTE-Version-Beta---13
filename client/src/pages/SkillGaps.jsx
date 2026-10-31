import React, { useMemo, useState } from 'react';
import Badge from '../components/Badge';
import {
  IconTarget,
  IconSparkles,
  IconCheckCircle,
  IconArrowRight,
  IconBookOpen,
  IconBriefcase
} from '../components/Icons';

export default function SkillGaps({ profile, jobs = [], saved = [], onSelectJob }) {
  const [roleFilter, setRoleFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const verifiedSkills = (profile?.existingSkills || [])
    .filter(s => s.confidence === 'verified')
    .map(s => s.name.toLowerCase());

  const selfDeclaredSkills = (profile?.existingSkills || [])
    .filter(s => s.confidence === 'self-declared')
    .map(s => s.name.toLowerCase());

  const learningGoals = (profile?.learningGoals || []).map(g => g.toLowerCase());

  const relevantJobs = useMemo(() => {
    const savedOrLoaded = saved.length ? jobs.filter(job => saved.includes(job.id)) : jobs;
    const unique = [...new Map(savedOrLoaded.map(job => [job.id, job])).values()];
    const roleQuery = roleFilter.trim().toLowerCase();
    const locationQuery = locationFilter.trim().toLowerCase();
    return unique.filter(job =>
      (!roleQuery || `${job.title} ${job.company}`.toLowerCase().includes(roleQuery))
      && (!locationQuery || String(job.location || '').toLowerCase().includes(locationQuery))
    );
  }, [jobs, saved, roleFilter, locationFilter]);

  const prioritizedGaps = useMemo(() => {
    const frequencies = new Map();
    for (const job of relevantJobs) {
      const requirements = [...new Set((job.requiredSkills || []).map(skill => String(skill).trim()).filter(Boolean))];
      const preferred = [...new Set((job.preferredSkills || []).map(skill => String(skill).trim()).filter(Boolean))];
      const unclassified = requirements.length || preferred.length ? [] : [...new Set((job.skills || []).map(skill => String(skill).trim()).filter(Boolean))];
      const signals = [
        ...requirements.map(name => [name, 'requiredCount']),
        ...preferred.map(name => [name, 'preferredCount']),
        ...unclassified.map(name => [name, 'unclassifiedCount'])
      ];
      const seen = new Set();
      for (const [name, field] of signals) {
        const key = name.toLowerCase();
        if (seen.has(key) || verifiedSkills.includes(key) || selfDeclaredSkills.includes(key)) continue;
        seen.add(key);
        const gap = frequencies.get(key) || { name, requiredCount: 0, preferredCount: 0, unclassifiedCount: 0, jobs: new Map() };
        gap[field] += 1;
        gap.jobs.set(job.id, job);
        frequencies.set(key, gap);
      }
    }
    return [...frequencies.values()]
      .map(gap => ({ ...gap, jobs: [...gap.jobs.values()], count: gap.jobs.size }))
      .sort((left, right) => right.requiredCount - left.requiredCount
        || right.preferredCount - left.preferredCount
        || right.count - left.count)
      .slice(0, 8);
  }, [relevantJobs, verifiedSkills, selfDeclaredSkills]);

  const collectionDates = relevantJobs
    .map(job => new Date(job.lastDiscoveredAt || job.postedAt))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((left, right) => left - right);

  // Suggested roadmap generator for top gaps
  const getLearningAction = skillName => {
    const s = skillName.toLowerCase();
    if (s.includes('python')) {
      return 'Build an async FastAPI service integrating external REST APIs and SQLite persistence.';
    }
    if (s.includes('docker') || s.includes('linux')) {
      return 'Containerize a local fullstack app with a Dockerfile and test multi-stage builds.';
    }
    if (s.includes('typescript')) {
      return 'Migrate 3 React components to strict TypeScript interfaces with discriminated unions.';
    }
    if (s.includes('rest') || s.includes('api')) {
      return 'Implement an authenticated JWT client with request retries and exponential backoff.';
    }
    if (s.includes('flutter') || s.includes('dart')) {
      return 'Construct an offline-first mobile view with Riverpod state management and SQLite.';
    }
    return `Complete a demonstrable mini-project applying ${skillName} in an end-to-end repository.`;
  };

  return (
    <div className="skillgaps-page animate-fade-in">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Skill Gap Analysis & Roadmap</h1>
          <p className="page-subtitle">
            Compare required and preferred skills across the unique listings currently loaded. This is a sample of your opportunities, not a market-wide demand estimate.
          </p>
        </div>
      </div>

      {/* Top Gap Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {prioritizedGaps.slice(0, 3).map((gap, idx) => {
          const isGoal = learningGoals.includes(gap.name.toLowerCase());
          return (
            <div key={gap.name} className="card hover-lift border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  Priority #{idx + 1}
                </span>
                <Badge kind={isGoal ? 'ok' : 'warn'} size="sm">
                  {isGoal ? 'In Learning Goals' : 'Unscheduled Gap'}
                </Badge>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{gap.name}</h3>
              <p className="text-xs text-slate-600 mt-1">
                Listed in <strong>{gap.count}</strong> of {relevantJobs.length} unique opportunities
                {gap.requiredCount ? ` · required in ${gap.requiredCount}` : ''}
                {gap.preferredCount ? ` · preferred in ${gap.preferredCount}` : ''}.
              </p>

              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Suggested Action:
                </span>
                <p className="text-xs text-slate-600 italic leading-relaxed">
                  "{getLearningAction(gap.name)}"
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Skill Demand Table */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Skill Signals in Loaded Opportunities
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {relevantJobs.length} unique listing(s)
              {collectionDates.length ? ` · observed ${collectionDates[0].toLocaleDateString()} – ${collectionDates[collectionDates.length - 1].toLocaleDateString()}` : ''}
              {saved.length ? ' · saved opportunities' : ' · currently loaded search results'}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              {relevantJobs.length < 10 ? 'Limited sample: treat repeated skills as signals in these listings only, not as market-wide demand.' : 'This sample reflects only the currently loaded listings and filters; it is not a market-wide survey.'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input className="form-input" aria-label="Filter by role or company" placeholder="Filter role or company" value={roleFilter} onChange={event => setRoleFilter(event.target.value)} />
            <input className="form-input" aria-label="Filter by location" placeholder="Filter location" value={locationFilter} onChange={event => setLocationFilter(event.target.value)} />
          </div>
        </div>
        <table className="modern-table">
          <thead>
            <tr>
              <th>Skill / Technology</th>
              <th>Status in Profile</th>
              <th>Required / Preferred</th>
              <th>Listings Showing It</th>
              <th>Recommended Learning Project</th>
            </tr>
          </thead>
          <tbody>
            {prioritizedGaps.map(gap => {
              const isGoal = learningGoals.includes(gap.name.toLowerCase());
              return (
                <tr key={gap.name} className="hover:bg-slate-50">
                  <td className="font-semibold text-slate-900">{gap.name}</td>
                  <td>
                    <Badge kind={isGoal ? 'ok' : 'neutral'} size="sm">
                      {isGoal ? 'Active Goal' : 'Not Registered'}
                    </Badge>
                  </td>
                  <td className="text-xs text-slate-700">
                    {gap.requiredCount} required · {gap.preferredCount} preferred
                    {gap.unclassifiedCount ? ` · ${gap.unclassifiedCount} unclassified` : ''}
                  </td>
                  <td>
                    <div className="text-xs text-slate-600">
                      {gap.jobs.slice(0, 2).map(j => j.title).join(', ')}
                      {gap.jobs.length > 2 && ` +${gap.jobs.length - 2} more`}
                    </div>
                  </td>
                  <td className="text-xs text-slate-700 max-w-xs">
                    {getLearningAction(gap.name)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!prioritizedGaps.length && (
          <div className="empty-state-panel py-8">
            <p className="text-slate-500">{relevantJobs.length ? 'No unconfirmed skill gaps were identified in this filtered sample.' : 'No matching job listings are loaded. Configure a job source or adjust the filters to analyze a real sample.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
