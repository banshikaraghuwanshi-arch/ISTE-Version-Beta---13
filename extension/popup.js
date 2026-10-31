const api = document.getElementById('api');
const token = document.getElementById('token');
const message = document.getElementById('message');
const defaultApiOrigin = 'http://localhost:4000';

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? 'error' : 'muted';
}

function normalizeOrigin(value) {
  const origin = String(value || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    throw new Error('For local development, API origin must be localhost or 127.0.0.1.');
  }
  return origin;
}

chrome.storage.local.get(['apiOrigin', 'extensionToken'], saved => {
  if (saved.apiOrigin) api.value = saved.apiOrigin;
  if (saved.extensionToken) token.value = saved.extensionToken;
});

document.getElementById('save').addEventListener('click', () => {
  const value = token.value.trim();
  if (!value) {
    showMessage('Paste the one-time extension token from Settings.', true);
    return;
  }
  try {
    const apiOrigin = normalizeOrigin(api.value || defaultApiOrigin);
    chrome.storage.local.set({ apiOrigin, extensionToken: value }, () => showMessage('Connection saved locally.'));
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.getElementById('fill').addEventListener('click', async () => {
  showMessage('Reading your approved profile...');
  const saved = await chrome.storage.local.get(['apiOrigin', 'extensionToken']);
  if (!saved.extensionToken) {
    showMessage('Save an extension token first.', true);
    return;
  }
  try {
    const origin = normalizeOrigin(saved.apiOrigin || defaultApiOrigin);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('Could not find the active browser tab.');
    }
    const pageUrl = new URL(tab.url || '');
    if (!['http:', 'https:'].includes(pageUrl.protocol)) {
      throw new Error('Open an employer application page in a normal browser tab before filling.');
    }
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    const response = await fetch(`${origin}/api/extension/profile`, {
      headers: { Authorization: `Extension ${saved.extensionToken}` }
    });
    if (!response.ok) {
      if (response.status === 401) {
        await chrome.storage.local.remove(['extensionToken']);
        token.value = '';
        throw new Error('The extension connection is expired or revoked; its saved token was cleared.');
      }
      if (response.status === 403) throw new Error('This connection is not allowed to read profile fields.');
      throw new Error('CareerPilot could not read the approved profile.');
    }
    const profile = await response.json();
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'CAREERPILOT_FILL', profile });
    if (!result?.detected) {
      showMessage('No supported profile fields found. Open an application form and try again.', true);
      return;
    }
    showMessage(`${result.filled} field(s) filled; ${result.skipped} left unchanged. Review all values before submitting.`);
  } catch (error) {
    const message = error.message || 'The extension could not complete the fill request.';
    showMessage(/cannot access contents|cannot be scripted|receiving end does not exist|not allowed to access/i.test(message)
      ? 'This page does not allow form assistance. Try the employer application page.'
      : message, true);
  }
});

document.getElementById('clear').addEventListener('click', () => {
  chrome.storage.local.remove(['apiOrigin', 'extensionToken'], () => {
    token.value = '';
    api.value = defaultApiOrigin;
    showMessage('Local extension connection cleared.');
  });
});
