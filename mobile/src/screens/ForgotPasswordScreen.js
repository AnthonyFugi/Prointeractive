import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim()) return Alert.alert('Email required', 'Enter your account email first.');
    setBusy(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setSent(true);
    } catch (e) {
      Alert.alert('Could not send', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: spacing.xl, justifyContent: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Check your email</Text>
        <Text style={{ color: colors.muted, marginTop: spacing.s, lineHeight: 21 }}>
          If that account exists, a reset link is on its way (valid for 15 minutes — check spam too).
          The link opens in your browser; choose a new password there, then come back and sign in.
        </Text>
        <Pressable onPress={() => navigation.navigate('Login')}
          style={{ backgroundColor: colors.navy, borderRadius: 10, padding: 14, marginTop: spacing.xl }}>
          <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>Back to sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: spacing.xl, justifyContent: 'center' }}>
      <Text style={{ fontSize: 26, fontWeight: '800' }}>Reset password</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>
        Enter your account email and we'll send you a reset link.
      </Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.l }}
      />
      <Pressable onPress={submit} disabled={busy}
        style={{ backgroundColor: colors.red, opacity: busy ? 0.6 : 1, borderRadius: 10, padding: 14, marginTop: spacing.l }}>
        <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>
          {busy ? 'Sending…' : 'Send reset link'}
        </Text>
      </Pressable>
    </View>
  );
}
