# CareerPilot AI Chrome extension

This Manifest V3 extension currently supports tested Greenhouse application pages only.

## Pairing

1. Sign in to CareerPilot and create a connection in Settings.
2. Copy the one-time scoped extension token into the popup.
3. Keep the token private; it is not the web JWT and is stored hashed by the server.

## Load locally in Chrome

1. Start the CareerPilot API on `http://localhost:4000`.
2. Open `chrome://extensions`, enable **Developer mode**, and select **Load unpacked**.
3. Choose this `extension` folder.
4. Open a tested Greenhouse application page, open the extension popup, save the token, and click **Fill supported fields**.

The local API origin is intentionally restricted to `localhost` and `127.0.0.1` in the popup. Update the extension host permissions and API-origin validation together before using a deployed API.

## Safety limits

- Filling requires an explicit click in the popup.
- Existing non-empty fields are not overwritten.
- Only name, email, phone, and location fields are supported.
- The extension dispatches input/change events for controlled forms.
- It never clicks Submit, bypasses CAPTCHA/OTP/MFA, fills employer passwords, or sends resumes.
- Review every value and submit the employer form yourself.
- Other portals are not supported or claimed to work.
- The extension stores only the API origin and scoped extension token in Chrome local storage. Clear the local connection when the browser profile is no longer trusted.
