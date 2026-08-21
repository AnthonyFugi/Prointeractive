import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

function friendlySignInError(message) {
  if (!message) return "We couldn't sign you in. Please try again.";
  if (message === 'Invalid credentials') {
    return "That email or password doesn't look right. Please try again.";
  }
  // Anything that doesn't read like a clean, specific message from our own
  // backend (a network failure, a native SDK's own internal error text,
  // etc.) — show a warm, generic fallback rather than raw technical text.
  const looksTechnical = /error|failed to fetch|network request|timeout|undefined|null/i.test(message) && message.length > 60;
  return looksTechnical ? "We couldn't sign you in. Please check your connection and try again." : message;
}
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

// Styles live here, created once, on purpose.
//
// These inputs previously had their style passed as an inline object literal.
// That builds a brand-new object on every render, so every keystroke handed
// UIKit what looked like a changed prop and iOS re-evaluated the field — which
// is what made the QuickType bar re-trigger constantly and led to
// textContentType being removed last time. The prop churn was the bug, not
// textContentType. With a stable StyleSheet reference the field is left alone
// between keystrokes, and the autofill hints below can safely come back.
const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
  },
  inputFirst: { marginTop: spacing.l },
  inputNext: { marginTop: spacing.s },
  label: { fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: spacing.s, color: colors.ink },
});

export default function LoginScreen({ navigation }) {
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await login(email, password);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Sign in failed', friendlySignInError(e.message));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleBusy(true);
    try {
      await loginWithGoogle();
      navigation.goBack();
    } catch (e) {
      if (!e.cancelled) Alert.alert('Sign in failed', friendlySignInError(e.message));
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleApple = async () => {
    setAppleBusy(true);
    try {
      await loginWithApple();
      navigation.goBack();
    } catch (e) {
      if (!e.cancelled) Alert.alert('Sign in failed', friendlySignInError(e.message));
    } finally {
      setAppleBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.paper }} keyboardVerticalOffset={90}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 26, fontWeight: '800' }}>🔑 Sign in</Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>
        Follow stores you love, save items for later, track orders, and message businesses directly.
      </Text>
      <Text style={styles.label}>Email</Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        // 'username' is what marks this as the account identifier for both
        // platforms' password managers; 'email' alone only shapes the keyboard.
        autoComplete="username"
        textContentType="username"
        importantForAutofill="yes"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, styles.inputFirst]}
      />
      <Text style={styles.label}>Password</Text>
      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        importantForAutofill="yes"
        // Submitting from the keyboard, rather than only via the button, is
        // what iOS treats as a login attempt — it's part of what triggers the
        // system's own "Save Password?" prompt afterwards.
        returnKeyType="go"
        onSubmitEditing={submit}
        style={[styles.input, styles.inputNext]}
      />
      <Pressable onPress={submit} disabled={busy}
        style={{ backgroundColor: colors.red, opacity: busy ? 0.6 : 1, borderRadius: 10, padding: 14, marginTop: spacing.l }}>
        <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>{busy ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.l, marginBottom: spacing.m }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <Text style={{ color: colors.muted, marginHorizontal: 10, fontSize: 12 }}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      </View>

      {googleBusy ? (
        <View style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.ink} size="small" />
        </View>
      ) : (
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Light}
          style={{ width: '100%', height: 48 }}
          onPress={handleGoogle}
        />
      )}

      {Platform.OS === 'ios' ? (
        appleBusy ? (
          <View style={{ height: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.s }}>
            <ActivityIndicator color={colors.ink} size="small" />
          </View>
        ) : (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={{ height: 44, marginTop: spacing.s }}
            onPress={handleApple}
          />
        )
      ) : null}

      <Pressable onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.m }}>
        <Text style={{ color: colors.navy, textAlign: 'center', fontWeight: '600' }}>New here? Create an account</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ marginTop: spacing.s }}>
        <Text style={{ color: colors.muted, textAlign: 'center', fontWeight: '600' }}>Forgot your password?</Text>
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
