import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function AccountScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: spacing.xl }}>
      {user ? (
        <>
          <Text style={{ fontSize: 22, fontWeight: '800' }}>{user.name}</Text>
          <Text style={{ color: colors.muted }}>{user.email}</Text>
          <Pressable onPress={() => navigation.navigate('Inbox')}
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginTop: spacing.xl }}>
            <Text style={{ fontWeight: '700' }}>Inbox — conversations with businesses</Text>
          </Pressable>
          <Pressable onPress={logout}
            style={{ borderWidth: 1.5, borderColor: colors.red, borderRadius: 10, padding: 14, marginTop: spacing.m }}>
            <Text style={{ color: colors.red, fontWeight: '800', textAlign: 'center' }}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 22, fontWeight: '800' }}>Welcome</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>Sign in to order, pay, and message businesses.</Text>
          <Pressable onPress={() => navigation.navigate('Login')}
            style={{ backgroundColor: colors.navy, borderRadius: 10, padding: 14, marginTop: spacing.l }}>
            <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>Sign in</Text>
          </Pressable>
        </>
      )}
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 'auto', fontSize: 12 }}>
        Pro·interactive — Making business interaction, Easy!
      </Text>
    </View>
  );
}
