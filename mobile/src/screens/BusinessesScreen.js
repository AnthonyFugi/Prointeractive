import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import VerifiedBadge from '../components/VerifiedBadge';
import { colors, spacing } from '../theme';

export default function BusinessesScreen({ navigation }) {
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
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>Businesses you can talk to</Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2, marginBottom: spacing.m }}>
        Every storefront is a real Zambian business — browse their products or message them directly.
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
              <Text style={{ fontWeight: '700', fontSize: 16 }}>{b.name}</Text>
              {b.verified ? <VerifiedBadge size={15} /> : null}
            </View>
            <Text style={{ color: colors.muted, marginTop: 2 }}>
              {(b.categories && b.categories.length ? b.categories.join(' · ') : b.category)}{b.location ? ` · ${b.location}` : ''}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
