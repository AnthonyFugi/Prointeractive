import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function DeleteAccountScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!password) return Alert.alert('Password required', 'Enter your password to confirm.');
    Alert.alert(
      'Permanently delete account?',
      'Your profile, conversations, and favorites will be deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api('/auth/me', { method: 'DELETE', body: { password } });
              await logout();
              navigation.popToTop();
              Alert.alert('Account deleted', 'Your account and personal data have been removed.');
            } catch (e) {
              Alert.alert('Could not delete', e.message);
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: spacing.xl }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.red }}>Delete account</Text>
      <Text style={{ color: colors.muted, marginTop: spacing.s, lineHeight: 20 }}>
        Deleting your account removes your profile, conversations, and favorites permanently.
        {user && user.role === 'business' ? ' Your storefront will be closed and your products removed from the shop.' : ''}
        {'\n\n'}Records of completed transactions are kept in anonymised form for legal and
        accounting purposes (see proint.web.app/privacy).
      </Text>
      <TextInput
        placeholder="Your password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.l }}
      />
      <Pressable onPress={submit} disabled={busy}
        style={{ backgroundColor: colors.red, opacity: busy ? 0.6 : 1, borderRadius: 10, padding: 14, marginTop: spacing.l }}>
        <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>
          {busy ? 'Deleting…' : 'Permanently delete my account'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
