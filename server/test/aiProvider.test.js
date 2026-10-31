import test from 'node:test';
import assert from 'node:assert/strict';
import { extractResumeProfile } from '../src/services/aiProvider.js';

async function withMockAIResponse(content, callback) {
  const originalFetch = globalThis.fetch;
  const previous = {
    provider: process.env.AI_PROVIDER,
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL
  };
  process.env.AI_PROVIDER = 'groq';
  process.env.AI_API_KEY = 'test-key';
  process.env.AI_MODEL = 'test-model';
  globalThis.fetch = async () => Response.json({
    choices: [{ message: { content: JSON.stringify(content) } }]
  });
  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('resume extraction rejects invented personal details and portfolio URLs', async () => {
  const resumeText = 'Alice Johnson\nalice@example.com\n+1 555 123 4567\nlinkedin.com/in/alice-johnson\nFrontend Engineer';
  await withMockAIResponse({
    personalInfo: {
      fullName: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+1 555 123 4567',
      location: 'San Francisco',
      linkedIn: 'https://linkedin.com/in/alice-johnson',
      github: 'https://github.com/alice-johnson',
      portfolio: 'https://random-portfolio.example',
      summary: 'Invented professional summary'
    }
  }, async () => {
    const result = await extractResumeProfile({ resumeText });
    assert.equal(result.personalInfo.fullName, 'Alice Johnson');
    assert.equal(result.personalInfo.email, 'alice@example.com');
    assert.equal(result.personalInfo.phone, '+1 555 123 4567');
    assert.equal(result.personalInfo.location, '');
    assert.equal(result.personalInfo.linkedIn, 'https://linkedin.com/in/alice-johnson');
    assert.equal(result.personalInfo.github, '');
    assert.equal(result.personalInfo.portfolio, '');
    assert.equal(result.personalInfo.summary, '');
  });
});

test('resume extraction accepts a portfolio URL only when it appears in the resume', async () => {
  const resumeText = 'Alice Johnson\nPortfolio: https://alice.dev/work';
  await withMockAIResponse({
    personalInfo: { portfolioUrl: 'https://alice.dev/work' }
  }, async () => {
    const result = await extractResumeProfile({ resumeText });
    assert.equal(result.personalInfo.portfolio, 'https://alice.dev/work');
  });
});

test('resume extraction fills clear personal details from source text when AI omits them', async () => {
  const resumeText = [
    'Morgan Patel',
    'morgan.patel@example.com',
    '+91 98765 43210',
    'linkedin.com/in/morgan-patel',
    'https://morganpatel.dev'
  ].join('\n');
  await withMockAIResponse({ personalInfo: {} }, async () => {
    const result = await extractResumeProfile({ resumeText });
    assert.deepEqual(result.personalInfo, {
      fullName: 'Morgan Patel',
      email: 'morgan.patel@example.com',
      phone: '+91 98765 43210',
      location: '',
      linkedIn: 'https://linkedin.com/in/morgan-patel',
      github: '',
      portfolio: 'https://morganpatel.dev/',
      summary: ''
    });
  });
});
