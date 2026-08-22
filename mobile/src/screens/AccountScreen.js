import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { colors, money, setDisplayCurrency, spacing } from '../theme';
import { formatPhone } from '../phone';

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

            <Text style={{ fontWeight: '700', marginBottom: 8, marginTop: 16 }}>Phone</Text>
            <TextInput
              placeholder="e.g. 0977 123 456"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              defaultValue={user.phone ? formatPhone(user.phone) : ''}
              onBlur={async (e) => {
                try {
                  await api('/auth/preferences', { method: 'PATCH', body: { phone: e.nativeEvent.text.trim() } });
                  if (refresh) await refresh();
                } catch (_e) {}
              }}
              style={{
                backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.ink,
              }}
            />
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>So sellers can reach you on WhatsApp about your orders.</Text>
          </View>

          <Pressable onPress={() => navigation.navigate('ForgotPassword')}
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginTop: spacing.s }}>
            <Text style={{ fontWeight: '700' }}>Change password</Text>
          </Pressable>

          <Pressable onPress={logout}
            style={{ borderWidth: 1.5, borderColor: colors.red, borderRadius: 10, padding: 14, marginTop: spacing.m }}>
            <Text style={{ color: colors.red, fontWeight: '800', textAlign: 'center' }}>Sign out</Text>
          </Pressable>
          {/* Both app stores require reachable policy links, and Apple review
              checks for them. These open the canonical web pages rather than
              duplicating the text, so there's only one copy to keep current. */}
          <View style={{ marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.l }}>
            {[
              ['Terms of Service', 'https://prointapp.com/terms'],
              ['Privacy Policy', 'https://prointapp.com/privacy'],
              ['Product Standards', 'https://prointapp.com/product-standards'],
            ].map(([label, url]) => (
              <Pressable
                key={url}
                onPress={() => Linking.openURL(url).catch(() => {})}
                style={{ paddingVertical: 10 }}
              >
                <Text style={{ color: colors.navy, fontWeight: '600', fontSize: 14 }}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={() => navigation.navigate('DeleteAccount')} style={{ marginTop: spacing.l }}>
            <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13, textDecorationLine: 'underline' }}>
              Delete account
            </Text>
          </Pressable>
        </>
      ) : (
        /* Signed out. Previously this was a title, two buttons, and about
           two-thirds of a blank screen. The content block is now vertically
           centred and says what an account is actually for, so the screen
           reads as deliberate rather than unfinished. */
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: spacing.xl }}>
          <Text style={{ fontSize: 26, fontWeight: '800', textAlign: 'center', color: colors.ink }}>Welcome</Text>
          <Text style={{ color: colors.muted, marginTop: 6, textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
            Sign in to order, pay, and message businesses.
          </Text>

          <View style={{
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
            borderRadius: 12, padding: spacing.l, marginTop: spacing.xl, gap: spacing.m,
          }}>
            {[
              ['Order and pay', 'Mobile money, card, or cash on delivery.'],
              ['Message businesses', 'Ask before you buy — replies land in your Inbox.'],
              ['Follow your favourites', 'See their new stock first.'],
            ].map(([title, body]) => (
              <View key={title} style={{ flexDirection: 'row', gap: spacing.m, alignItems: 'flex-start' }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 3, backgroundColor: colors.red, marginTop: 6,
                }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 14, color: colors.ink }}>{title}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1, lineHeight: 17 }}>{body}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            style={({ pressed }) => ({
              backgroundColor: colors.navy, borderRadius: 12, padding: 15, marginTop: spacing.xl,
              alignItems: 'center', opacity: pressed ? 0.85 : 1,
            })}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Sign in</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Register')}
            accessibilityRole="button"
            style={({ pressed }) => ({
              borderWidth: 1.5, borderColor: colors.navy, borderRadius: 12, padding: 15,
              marginTop: spacing.s, alignItems: 'center', opacity: pressed ? 0.85 : 1,
            })}>
            <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 15 }}>Create account</Text>
          </Pressable>

          {/* Store review requires these reachable without an account —
              they were only rendered in the signed-in branch. */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: spacing.l }}>
            {[
              ['Terms', 'https://prointapp.com/terms'],
              ['Privacy', 'https://prointapp.com/privacy'],
              ['Product Standards', 'https://prointapp.com/product-standards'],
            ].map(([label, url], i) => (
              <View key={url} style={{ flexDirection: 'row', alignItems: 'center' }}>
                {i > 0 ? <Text style={{ color: colors.line, marginHorizontal: 8 }}>|</Text> : null}
                <Pressable onPress={() => Linking.openURL(url).catch(() => {})} hitSlop={6}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}
      <Text style={{
        color: colors.muted, textAlign: 'center', fontSize: 12,
        marginTop: user ? 'auto' : spacing.l, paddingTop: spacing.l,
      }}>
        Pro·interactive — Making business interaction, Easy!
      </Text>
    </ScrollView>
  );
}
