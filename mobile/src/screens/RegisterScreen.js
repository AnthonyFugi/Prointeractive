import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await register({ ...form, role: 'customer' });
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
      <TextInput placeholder="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.l }} />
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.s }} />
      <TextInput placeholder="Password (8+ characters)" secureTextEntry value={form.password} onChangeText={(v) => setForm({ ...form, password: v })}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.s }} />
      <Pressable onPress={submit} disabled={busy}
        style={{ backgroundColor: colors.red, opacity: busy ? 0.6 : 1, borderRadius: 10, padding: 14, marginTop: spacing.l }}>
        <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>{busy ? 'Creating…' : 'Create account'}</Text>
      </Pressable>
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.m, fontSize: 12 }}>
        Selling on Prointeractive? Register a business account on the website.
      </Text>
    </View>
  );
}
