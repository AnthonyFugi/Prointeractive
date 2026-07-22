import { useState } from 'react';
import { Alert, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const submit = async () => {
    if (!accepted) return Alert.alert('Terms & Conditions', 'Please accept the Terms & Conditions to create an account.');
    setBusy(true);
    try {
      await register({ ...form, role: 'customer', acceptedTerms: true });
      navigation.popToTop();
    } catch (e) {
      Alert.alert('Could not register', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: spacing.xl, justifyContent: 'center' }}>
      <Text style={{ fontSize: 26, fontWeight: '800' }}>Create account</Text>
      <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: spacing.s, color: colors.ink }}>Full name</Text>
      <TextInput placeholder="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.l }} />
      <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: spacing.s, color: colors.ink }}>Email</Text>
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.s }} />
      <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: spacing.s, color: colors.ink }}>Password</Text>
      <TextInput placeholder="Password (8+ characters)" secureTextEntry value={form.password} onChangeText={(v) => setForm({ ...form, password: v })}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.s }} />
      <Pressable onPress={() => setAccepted(!accepted)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.l }}>
        <View style={{
          width: 22, height: 22, borderRadius: 6, borderWidth: 2,
          borderColor: accepted ? colors.navy : colors.line,
          backgroundColor: accepted ? colors.navy : 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {accepted ? <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>✓</Text> : null}
        </View>
        <Text style={{ flex: 1, color: colors.muted, fontSize: 13 }}>
          I agree to the{' '}
          <Text style={{ color: colors.navy, fontWeight: '700' }}
            onPress={() => Linking.openURL('https://proint.web.app/terms')}>
            Terms & Conditions
          </Text>
          {' '}and{' '}
          <Text style={{ color: colors.navy, fontWeight: '700' }}
            onPress={() => Linking.openURL('https://proint.web.app/privacy')}>
            Privacy Policy
          </Text>
        </Text>
      </Pressable>
      <Pressable onPress={submit} disabled={busy}
        style={{ backgroundColor: colors.red, opacity: busy ? 0.6 : 1, borderRadius: 10, padding: 14, marginTop: spacing.l }}>
        <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>{busy ? 'Creating…' : 'Create account'}</Text>
      </Pressable>
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.l, fontSize: 13 }}>
        Selling on Prointeractive?{' '}
        <Text
          style={{ color: colors.navy, fontWeight: '700', textDecorationLine: 'underline' }}
          onPress={() => Linking.openURL('https://proint.web.app/register?role=business')}
        >
          Register a business account on the website
        </Text>
      </Text>
    </View>
  );
}
