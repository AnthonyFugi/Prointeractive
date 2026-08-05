import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import { colors, spacing } from '../theme';

export default function DealsScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ onSale: 'true', page: 1, limit: 12 });
    if (query) params.set('q', query);
    return api(`/products?${params}`)
      .then((d) => {
        setProducts(d.products || []);
        setPage(1);
        setPages(d.pages || 1);
      })
      .catch(() => {});
  }, [query]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || page >= pages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    const params = new URLSearchParams({ onSale: 'true', page: nextPage, limit: 12 });
    if (query) params.set('q', query);
    api(`/products?${params}`)
      .then((d) => {
        setProducts((prev) => [...prev, ...(d.products || [])]);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loading, loadingMore, page, pages, query]);

  const onRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.red} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FlatList
        ref={listRef}
        data={products}
        numColumns={2}
        keyExtractor={(p) => p._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.m, paddingBottom: 40 }}
        columnWrapperStyle={{ paddingHorizontal: spacing.m }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: spacing.m, marginBottom: spacing.m }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>Deals 🏷️</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2, marginBottom: spacing.m }}>
              Real businesses running real sales — same trust, same direct messaging, just marked down.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={q}
                onChangeText={setQ}
                onSubmitEditing={() => setQuery(q)}
                placeholder="Search deals…"
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={{
                  flex: 1, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line,
                  borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: colors.ink,
                }}
              />
              <Pressable
                onPress={() => setQuery(q)}
                style={{ backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Go</Text>
              </Pressable>
            </View>
          </View>
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={colors.navy} style={{ marginVertical: spacing.l }} /> : null
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing.l, paddingTop: spacing.xl }}>
            <Text style={{ fontWeight: '800', fontSize: 16 }}>
              {query ? `No deals matching "${query}"` : 'No deals right now'}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {query ? 'Try a different search.' : 'Sellers run special-occasion discounts from time to time — check back soon.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => navigation.navigate('Product', { id: item._id })} />
        )}
      />
    </View>
  );
}
