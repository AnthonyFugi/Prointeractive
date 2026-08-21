/**
 * Ask the browser's password manager to offer saving the credentials the user
 * just signed in with.
 *
 * Why this is needed at all: Chrome normally decides to show "Save password?"
 * by watching a real form submission followed by a page navigation. We're a
 * single-page app — the form is submitted with preventDefault() and the router
 * swaps the view without a navigation — so that heuristic never fires and the
 * prompt is silently skipped. The Credential Management API lets us ask for it
 * explicitly instead of hoping the browser guesses right.
 *
 * The prompt itself is the browser's own, so the user taps "Save" or "Never" in
 * native UI. We never see or store the password ourselves, and nothing is
 * written without the user agreeing.
 *
 * Support is uneven and that's fine — this is a pure enhancement:
 *   Chrome / Edge / Android Chrome  -> explicit prompt, works
 *   Safari / Firefox               -> no API; their own heuristics still apply
 * A browser without it just behaves exactly as it does today.
 */

const supported = () =>
  typeof window !== 'undefined' &&
  'credentials' in navigator &&
  typeof window.PasswordCredential === 'function';

/**
 * Offer to save an email/password pair after a successful sign-in or sign-up.
 * Never throws — a password manager that declines or errors must not break
 * the login flow the user actually came here for.
 *
 * @param {string} email    the account's email (used as the credential id)
 * @param {string} password the password just used to authenticate
 * @param {string} [name]   display name, shown in the browser's manager UI
 */
export async function offerToSavePassword(email, password, name) {
  if (!supported() || !email || !password) return false;
  try {
    const credential = new window.PasswordCredential({
      id: email,
      password,
      name: name || email,
    });
    await navigator.credentials.store(credential);
    return true;
  } catch {
    // Blocked by permissions policy, a non-secure context, or user settings.
    return false;
  }
}

/**
 * Called on sign-out. Tells the browser not to hand credentials back
 * automatically on the next visit, so the following sign-in requires a
 * deliberate choice from whoever is holding the device. Important on the shared
 * and family phones that are common among our buyers.
 */
export async function forgetAutoSignIn() {
  if (!('credentials' in navigator) || !navigator.credentials.preventSilentAccess) return;
  try {
    await navigator.credentials.preventSilentAccess();
  } catch {
    /* nothing useful to do here */
  }
}
