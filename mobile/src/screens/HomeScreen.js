import { useEffect, useState } from 'react';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import { colors, spacing } from '../theme';

export default function HomeScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    api('/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: 20 });
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    return api(`/products?${params}`)
      .then((d) => setProducts(d.products))
      .catch(() => {});
  }, [query, category]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([load(), api('/categories').then((d) => setCategories(d.categories)).catch(() => {})])
      .finally(() => setRefreshing(false));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ padding: spacing.l }}>
        <Text style={{ color: colors.red, fontWeight: '700', fontSize: 11, letterSpacing: 1.5 }}>
          MAKING BUSINESS INTERACTION, EASY!
        </Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 4 }}>
          Buy from businesses you can actually talk to.
        </Text>
        <View style={{ flexDirection: 'row', marginTop: spacing.m, gap: 8 }}>
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => setQuery(q)}
            placeholder="Search products…"
            returnKeyType="search"
            style={{
              flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
              borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
            }}
          />
          <Pressable
            onPress={() => setQuery(q)}
            style={{ backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Go</Text>
          </Pressable>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(c) => c._id}
          style={{ marginTop: spacing.m }}
          renderItem={({ item: c }) => {
            const on = category === c.name;
            return (
              <Pressable
                onPress={() => setCategory(on ? '' : c.name)}
                style={{
                  borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 5, marginRight: 8,
                  backgroundColor: on ? colors.navy : colors.surface,
                  borderColor: on ? colors.navy : colors.line,
                }}
              >
                <Text style={{ color: on ? '#fff' : colors.ink, fontSize: 13 }}>{c.name}</Text>
              </Pressable>
            );
          }}
        />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(p) => p._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: spacing.m, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>No products found</Text>}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => navigation.navigate('Product', { id: item._id })} />
          )}
        />
      )}
    </View>
  );
}
