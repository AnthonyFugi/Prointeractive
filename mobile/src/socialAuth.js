import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';

// The WEB client ID — reused as the "audience" Google puts on the ID token
// even for native sign-in. Counterintuitive, but this is Google's own
// documented behaviour: the Android/iOS clients registered in Google Cloud
// Console are used behind the scenes to authorize the native sign-in sheet
// itself, but never appear as the token's audience. This is exactly why
// the backend's existing googleAuth() verification needs no changes at
// all — it already accepts this same client ID.
const WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId;
const IOS_CLIENT_ID = Constants.expoConfig?.extra?.googleClientIdIOS;

let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    offlineAccess: false,
  });
  googleConfigured = true;
}

/**
 * Runs Google's native sign-in sheet and returns a Google ID token (JWT) —
 * the exact same shape the backend's /auth/google already expects from web.
 * Throws if the user cancels or the flow fails; callers should check
 * err.cancelled and simply not show an error for a plain cancellation.
 */
export async function signInWithGoogle() {
  if (!WEB_CLIENT_ID) {
    throw new Error('Google sign-in is not configured for this build.');
  }
  ensureGoogleConfigured();

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const result = await GoogleSignin.signIn();

    // The library's response shape changed across major versions — handle
    // both the current { type, data } envelope and the older flat shape,
    // so this keeps working regardless of exactly which version
    // `npx expo install` resolves.
    const idToken = result?.data?.idToken || result?.idToken;
    if (!idToken) {
      throw new Error('Google did not return a usable identity token.');
    }
    return idToken;
  } catch (e) {
    if (e.code === 'SIGN_IN_CANCELLED' || e.code === '-5' || /cancel/i.test(e.message || '')) {
      const err = new Error('Sign-in was cancelled.');
      err.cancelled = true;
      throw err;
    }
    throw e;
  }
}

/**
 * Runs Apple's native sign-in flow (iOS only — Apple does not support this
 * on Android at all). Returns { identityToken, name } matching the exact
 * body shape the backend's /auth/apple already expects.
 */
export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is only available on iOS.');
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Sign in with Apple is not available on this device.');
  }

  let credential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    if (e.code === 'ERR_REQUEST_CANCELED') {
      const err = new Error('Sign-in was cancelled.');
      err.cancelled = true;
      throw err;
    }
    throw e;
  }

  if (!credential.identityToken) {
    throw new Error('Apple did not return a usable identity token.');
  }

  // Apple only ever sends the name on the FIRST authorization — never
  // assume it'll be there on a returning user's sign-in.
  const name = credential.fullName && (credential.fullName.givenName || credential.fullName.familyName)
    ? { firstName: credential.fullName.givenName, lastName: credential.fullName.familyName }
    : undefined;

  return { identityToken: credential.identityToken, name };
}
