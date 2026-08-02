import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import VerifiedBadge from '../components/VerifiedBadge';
import { colors, spacing } from '../theme';

export default function BusinessesScreen({ navigation }) {
  const { user } = useAuth();
  const [followSet, setFollowSet] = useState(null); // null until seeded from user
  const followedIds = followSet || new Set((user?.favoriteBusinesses || []).map(String));
  const toggleFollow = async (b) => {
    const isOn = followedIds.has(String(b._id));
    const next = new Set(followedIds);
    if (isOn) next.delete(String(b._id)); else next.add(String(b._id));
    setFollowSet(next); // optimistic
    try {
      await api(`/businesses/${b._id}/favorite`, { method: 'POST', body: { favorited: !isOn } });
    } catch (e) {
      setFollowSet(followedIds); // revert
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
        returnKeyType="search"
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
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
              <View style={{ flex: 1 }} />
              {user && user.role === 'customer' ? (
                <Pressable
                  onPress={() => toggleFollow(b)}
                  hitSlop={8}
                  style={{
                    borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 4,
                    borderColor: colors.red,
                    backgroundColor: followedIds.has(String(b._id)) ? colors.red : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: followedIds.has(String(b._id)) ? '#fff' : colors.red }}>
                    {followedIds.has(String(b._id)) ? '✓ Following' : '+ Follow'}
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
