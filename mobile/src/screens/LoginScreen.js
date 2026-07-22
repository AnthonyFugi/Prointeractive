import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: spacing.xl, justifyContent: 'center' }}>
      <Text style={{ fontSize: 26, fontWeight: '800' }}>Sign in</Text>
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
      <Pressable onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.m }}>
        <Text style={{ color: colors.navy, textAlign: 'center', fontWeight: '600' }}>New here? Create an account</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ marginTop: spacing.s }}>
        <Text style={{ color: colors.muted, textAlign: 'center', fontWeight: '600' }}>Forgot your password?</Text>
      </Pressable>
    </View>
  );
}
