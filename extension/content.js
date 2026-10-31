const selectors = {
  firstName: ['input[name="first_name"]', 'input[id*="first_name" i]'],
  lastName: ['input[name="last_name"]', 'input[id*="last_name" i]'],
  email: ['input[type="email"]', 'input[name="email"]', 'input[id*="email" i]'],
  phone: ['input[type="tel"]', 'input[name="phone"]', 'input[id*="phone" i]'],
  location: ['input[name="location"]', 'input[name*="city" i]', 'input[id*="location" i]']
};

function findInput(candidateSelectors) {
  return candidateSelectors.map(selector => document.querySelector(selector)).find(Boolean);
}

function setValue(input, value) {
  if (!input || !String(value || '').trim() || input.value.trim()) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (!setter) return false;
  setter.call(input, String(value).trim());
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'CAREERPILOT_FILL') return;
  const profile = message.profile || {};
  let filled = 0;
  let skipped = 0;
  const nameParts = String(profile.name || '').trim().split(/\s+/);
  const fields = [
    [findInput(selectors.firstName), nameParts[0]],
    [findInput(selectors.lastName), nameParts.slice(1).join(' ')],
    [findInput(selectors.email), profile.email],
    [findInput(selectors.phone), profile.phone],
    [findInput(selectors.location), profile.location]
  ];
  for (const [input, value] of fields) {
    if (setValue(input, value)) filled += 1;
    else if (input) skipped += 1;
  }
  sendResponse({ filled, skipped });
  return true;
});
