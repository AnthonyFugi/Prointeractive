import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import VerifiedBadge from '../components/VerifiedBadge';
import { colors, spacing } from '../theme';

export default function BusinessesScreen({ navigation }) {
  const { user, refresh } = useAuth();
  // followedIds is ALWAYS computed fresh from user — never cached locally —
  // so a change made anywhere else (like unfollowing from the Account
  // screen) is reflected here immediately, not just the other way round.
  // `pending` is only a short-lived optimistic flag for whichever single
  // item is currently mid-request, cleared the moment it settles either
  // way, so it can never "lock in" and go stale the way a whole cached
  // Set previously did.
  const [pending, setPending] = useState({});
  const followedIds = new Set((user?.favoriteBusinesses || []).map(String));
  const isFollowed = (id) => {
    const key = String(id);
    return Object.prototype.hasOwnProperty.call(pending, key) ? pending[key] : followedIds.has(key);
  };
  const toggleFollow = async (b) => {
    const id = String(b._id);
    const isOn = isFollowed(id);
    setPending((p) => ({ ...p, [id]: !isOn })); // optimistic, this item only
    try {
      await api(`/businesses/${b._id}/favorite`, { method: 'POST', body: { favorited: !isOn } });
      // Sync the shared user object — this is the real source of truth
      // followedIds reads from; once it resolves, the pending override for
      // this item is cleared below and the fresh, correct value takes over.
      await refresh?.();
    } catch (e) {
      // leave pending as-is on failure momentarily; cleared in finally below
      // reverts visually back to the pre-toggle state since user never changed
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  };
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: 30 });
    if (query) params.set('q', query);
    return api(`/businesses?${params}`).then((d) => setBusinesses(d.businesses)).catch(() => {});
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: spacing.l }}>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: spacing.m }}>
        Real businesses — browse their products or message them directly.
      </Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => setQuery(q)}
        placeholder="Search businesses…"
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink }}
      />
      <FlatList
        data={businesses}
        keyExtractor={(b) => b._id}
        style={{ marginTop: spacing.m }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>No businesses found</Text>}
        renderItem={({ item: b }) => (
          <Pressable
            onPress={() => navigation.navigate('Business', { id: b._id })}
            style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: spacing.l, marginBottom: spacing.s }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
              <Text style={{ fontWeight: '700', fontSize: 16, flexShrink: 1 }}>{b.name}</Text>
              {b.verified ? <VerifiedBadge size={15} /> : null}
              <View style={{ width: 6 }} />
              <View style={{ flex: 1 }} />
              {user && user.role === 'customer' ? (
                <Pressable
                  onPress={() => toggleFollow(b)}
                  hitSlop={8}
                  style={{
                    borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 4,
                    borderColor: colors.red,
                    backgroundColor: isFollowed(b._id) ? colors.red : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isFollowed(b._id) ? '#fff' : colors.red }}>
                    {isFollowed(b._id) ? '✓ Following' : '+ Follow'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={{ color: colors.muted, marginTop: 2 }}>
              {(b.categories && b.categories.length ? b.categories.join(' · ') : b.category)}{b.location ? ` · ${b.location}` : ''}
            </Text>
            {b.ratingCount > 0 ? (
              <Text style={{ color: colors.muted, marginTop: 2, fontSize: 13 }}>
                <Text style={{ color: '#f5b301' }}>
                  {'★'.repeat(Math.round(b.ratingAverage))}{'☆'.repeat(5 - Math.round(b.ratingAverage))}
                </Text>
                {' '}({b.ratingCount})
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}
