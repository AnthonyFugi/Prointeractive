import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { colors, money, setDisplayCurrency, spacing } from '../theme';

export default function AccountScreen({ navigation }) {
  const { user, logout, refresh } = useAuth();
  const [business, setBusiness] = useState(null);

  const [following, setFollowing] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'business') {
      api('/businesses/mine')
        .then((d) => setBusiness(d.business))
        .catch(() => {});
    } else if (user.role === 'customer') {
      api('/businesses/favorites/mine')
        .then((d) => setFollowing(d.businesses))
        .catch(() => setFollowing([]));
    }
  }, [user, user?.favoriteBusinesses?.length]);

  const unfollow = async (b) => {
    try {
      await api(`/businesses/${b._id}/favorite`, { method: 'POST', body: { favorited: false } });
      setFollowing((prev) => (prev || []).filter((x) => x._id !== b._id));
      // This was the missing piece — every other screen (Businesses,
      // BusinessScreen, ProductScreen) was already fixed to read fresh from
      // user.favoriteBusinesses, but Account's own Unfollow button never
      // actually updated that shared object, only its own local list. So
      // the other screens were correctly reading a value that had never
      // been told anything changed.
      refresh?.();
    } catch (_e) {}
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ flexGrow: 1, padding: spacing.xl }}
    >
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
                prointapp.com/businesses/{business.slug || business._id}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: spacing.s }}>
                Edit store details, logo, and payouts in your web dashboard.
              </Text>
            </View>
          ) : null}
          {user.role === 'customer' && following && following.length > 0 ? (
            <View style={{ marginTop: spacing.l }}>
              <Text style={{ fontWeight: '800', marginBottom: spacing.s }}>Following ({following.length})</Text>
              {following.map((b) => (
                <View
                  key={b._id}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10,
                    padding: 10, marginBottom: spacing.s,
                  }}
                >
                  {b.logoUrl ? (
                    <Image
                      source={{ uri: b.logoUrl }}
                      style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, marginRight: spacing.m }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.navySoft, marginRight: spacing.m, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 16 }}>{b.name?.[0]?.toUpperCase() || '?'}</Text>
                    </View>
                  )}
                  <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Business', { id: b._id })}>
                    <Text style={{ fontWeight: '700' }} numberOfLines={1}>{b.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                      {(b.categories && b.categories.length ? b.categories.join(' · ') : b.category) || ''}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => unfollow(b)}
                    hitSlop={8}
                    style={{ borderWidth: 1.5, borderColor: colors.red, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginLeft: spacing.s }}
                  >
                    <Text style={{ color: colors.red, fontWeight: '700', fontSize: 12 }}>Unfollow</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable onPress={() => navigation.navigate('Inbox')}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10,
              padding: 14, marginTop: spacing.xl,
            }}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700' }}>Messages</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>Conversations with businesses</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 18 }}>›</Text>
          </Pressable>
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginTop: spacing.s }}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Display currency</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[['ZMW', 'Kwacha (K)'], ['USD', 'US Dollar ($)']].map(([cur, label]) => {
                const on = (user.preferences && user.preferences.currency) === cur || (!user.preferences?.currency && cur === 'ZMW');
                return (
                  <Pressable key={cur}
                    onPress={async () => {
                      try {
                        await api('/auth/preferences', { method: 'PATCH', body: { currency: cur } });
                        setDisplayCurrency(cur);
                        if (refresh) await refresh();
                      } catch (_e) {}
                    }}
                    style={{
                      borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 6,
                      borderColor: on ? colors.navy : colors.line,
                      backgroundColor: on ? colors.navy : 'transparent',
                    }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : colors.ink }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>USD is approximate (1 USD ≈ K18). Payments settle in Kwacha.</Text>

            <Text style={{ fontWeight: '700', marginBottom: 8, marginTop: 16 }}>My city</Text>
            <TextInput
              placeholder="e.g. Lusaka"
              placeholderTextColor={colors.muted}
              defaultValue={(user.preferences && user.preferences.city) || ''}
              onBlur={async (e) => {
                try {
                  await api('/auth/preferences', { method: 'PATCH', body: { city: e.nativeEvent.text } });
                  if (refresh) await refresh();
                } catch (_e) {}
              }}
              style={{
                backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.ink,
              }}
            />
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>Shows nearby stores first in the Businesses directory.</Text>
          </View>

          <Pressable onPress={() => navigation.navigate('ForgotPassword')}
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginTop: spacing.s }}>
            <Text style={{ fontWeight: '700' }}>Change password</Text>
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
            style={{ backgroundColor: colors.navy, borderRadius: 10, padding: 14, marginTop: spacing.l, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>🔑</Text>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Sign in</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Register')}
            style={{ borderWidth: 1.5, borderColor: colors.navy, borderRadius: 10, padding: 14, marginTop: spacing.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>✨</Text>
            <Text style={{ color: colors.navy, fontWeight: '800' }}>Create account</Text>
          </Pressable>
        </>
      )}
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 'auto', fontSize: 12 }}>
        Pro·interactive — Making business interaction, Easy!
      </Text>
    </ScrollView>
  );
}
