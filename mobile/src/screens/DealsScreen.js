import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import { colors, spacing } from '../theme';

export default function DealsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(() => {
    return api('/products?onSale=true&page=1&limit=12')
      .then((d) => {
        setProducts(d.products || []);
        setPage(1);
        setPages(d.pages || 1);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || page >= pages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    api(`/products?onSale=true&page=${nextPage}&limit=12`)
      .then((d) => {
        setProducts((prev) => [...prev, ...(d.products || [])]);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loading, loadingMore, page, pages]);

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
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
              Real businesses running real sales — same trust, same direct messaging, just marked down.
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={colors.navy} style={{ marginVertical: spacing.l }} /> : null
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing.l, paddingTop: spacing.xl }}>
            <Text style={{ fontWeight: '800', fontSize: 16 }}>No deals right now</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              Sellers run special-occasion discounts from time to time — check back soon.
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
