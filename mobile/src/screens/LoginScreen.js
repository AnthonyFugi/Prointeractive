import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

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
      Alert.alert('Sign in failed', e.message);
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
      if (!e.cancelled) Alert.alert('Sign in failed', e.message);
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
      if (!e.cancelled) Alert.alert('Sign in failed', e.message);
    } finally {
      setAppleBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: spacing.xl, justifyContent: 'center' }}>
      <Text style={{ fontSize: 26, fontWeight: '800' }}>🔑 Sign in</Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>
        Follow stores you love, save items for later, track orders, and message businesses directly.
      </Text>
      <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: spacing.s, color: colors.ink }}>Email</Text>
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.l }} />
      <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: spacing.s, color: colors.ink }}>Password</Text>
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.s }} />
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
    </View>
  );
}
