import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../api';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function AccountScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'business') return;
    api('/businesses/mine')
      .then((d) => setBusiness(d.business))
      .catch(() => {});
  }, [user]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: spacing.xl }}>
      {user ? (
        <>
          <Text style={{ fontSize: 22, fontWeight: '800' }}>{user.name}</Text>
          <Text style={{ color: colors.muted }}>{user.email}</Text>

          {business ? (
            <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginTop: spacing.l }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 16 }}>{business.name}</Text>
                {business.verified ? <VerifiedBadge size={16} /> : null}
              </View>
              {!business.verified ? (
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Not verified yet — request verification from your web dashboard</Text>
              ) : null}
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: spacing.s }}>
                {(business.categories && business.categories.length ? business.categories.join(' · ') : business.category) || 'No categories set'}
              </Text>
              {business.location ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>📍 {business.location}</Text> : null}
              {business.phone ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>📞 {business.phone}</Text> : null}
              <Text style={{ color: colors.navy, fontSize: 12, marginTop: spacing.s }}>
                proint.web.app/businesses/{business.slug || business._id}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: spacing.s }}>
                Edit store details, logo, and payouts in your web dashboard.
              </Text>
            </View>
          ) : null}
          <Pressable onPress={() => navigation.navigate('Inbox')}
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginTop: spacing.xl }}>
            <Text style={{ fontWeight: '700' }}>Inbox — conversations with businesses</Text>
          </Pressable>
          <Pressable onPress={logout}
            style={{ borderWidth: 1.5, borderColor: colors.red, borderRadius: 10, padding: 14, marginTop: spacing.m }}>
            <Text style={{ color: colors.red, fontWeight: '800', textAlign: 'center' }}>Sign out</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('DeleteAccount')} style={{ marginTop: spacing.l }}>
            <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13, textDecorationLine: 'underline' }}>
              Delete account
            </Text>
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
