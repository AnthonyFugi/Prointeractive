import { useEffect, useState } from 'react';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import { colors, spacing } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef(null);
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [featuredBiz, setFeaturedBiz] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    api('/categories').then((d) => setCategories(d.categories)).catch(() => {});
    api('/products/trending?limit=8').then((d) => setTrending(d.products)).catch(() => {});
    api('/products?featured=true&limit=8').then((d) => setFeatured((d.products || []).filter((p) => p.featured))).catch(() => {});
    api('/businesses?featured=true&limit=6').then((d) => setFeaturedBiz((d.businesses || []).filter((b) => b.featured))).catch(() => {});
    api('/products?onSale=true&limit=8').then((d) => setDeals((d.products || []).filter((p) => p.onSale))).catch(() => {});
  }, []);

  // Always fetches page 1 and REPLACES the list — used on mount, whenever
  // filters change, and on pull-to-refresh.
  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: 20, page: 1 });
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (favoritesOnly) params.set('favorites', 'true');
    if (savedOnly) params.set('saved', 'true');
    return api(`/products?${params}`)
      .then((d) => {
        setProducts(d.products || []);
        setPage(1);
        setPages(d.pages || 1);
      })
      .catch(() => {});
  }, [query, category, favoritesOnly, savedOnly]);

  // Fetches the NEXT page and APPENDS — this is what powers infinite scroll.
  // Previously the screen had no pagination at all: a hard limit of 20
  // products and no way to reach anything past them.
  const loadMore = useCallback(() => {
    if (loading || loadingMore || page >= pages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    const params = new URLSearchParams({ limit: 20, page: nextPage });
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (favoritesOnly) params.set('favorites', 'true');
    if (savedOnly) params.set('saved', 'true');
    api(`/products?${params}`)
      .then((d) => {
        setProducts((prev) => [...prev, ...(d.products || [])]);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loading, loadingMore, page, pages, query, category, favoritesOnly, savedOnly]);

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
      <FlatList
        ref={listRef}
        onScroll={(e) => setShowScrollTop(e.nativeEvent.contentOffset.y > 600)}
        scrollEventThrottle={200}
        data={products}
        numColumns={2}
        keyExtractor={(p) => p._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        columnWrapperStyle={{ paddingHorizontal: spacing.m }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={colors.navy} style={{ marginVertical: spacing.l }} /> : null
        }
        ListHeaderComponent={
          <View>
            <View style={{ padding: spacing.l }}>
              <Text style={{ color: colors.red, fontWeight: '700', fontSize: 11, letterSpacing: 1.5 }}>
                MAKING BUSINESS INTERACTION, EASY!
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 4 }}>
                What you need, from businesses you trust.
              </Text>
              <Text style={{ marginTop: spacing.s, fontSize: 12 }}>
                <Text style={{ color: colors.navy, fontWeight: '800' }}>✓ New &amp; authentic only</Text>
                <Text style={{ color: colors.muted }}> — every listing is first-owner, first-grade.</Text>
              </Text>
              <View style={{ flexDirection: 'row', marginTop: spacing.m, gap: 8 }}>
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  onSubmitEditing={() => setQuery(q)}
                  placeholder="What are you looking for today?"
                  placeholderTextColor={colors.muted}
                  returnKeyType="search"
                  style={{
                    flex: 1, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line,
                    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.ink,
                  }}
                />
                <Pressable
                  onPress={() => setQuery(q)}
                  style={{ backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 22, justifyContent: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Go</Text>
                </Pressable>
              </View>
              {!user ? (
                <Pressable
                  onPress={() => navigation.navigate('AccountTab')}
                  style={{ backgroundColor: colors.navy, borderRadius: 10, padding: spacing.m, marginTop: spacing.m }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                    Sign in to shop smarter → follow stores, save items, and see your feed first.
                  </Text>
                </Pressable>
              ) : null}
              {user && user.role === 'customer' && (
                (user.favoriteBusinesses && user.favoriteBusinesses.length > 0) ||
                (user.favoriteProducts && user.favoriteProducts.length > 0)
              ) ? (
                <View style={{ flexDirection: 'row', marginTop: spacing.m }}>
                  {user && user.role === 'customer' && user.favoriteBusinesses && user.favoriteBusinesses.length > 0 ? (
                    <Pressable
                      onPress={() => setFavoritesOnly(!favoritesOnly)}
                      style={{
                        borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 5, marginRight: 8,
                        backgroundColor: favoritesOnly ? colors.red : colors.surface,
                        borderColor: colors.red,
                      }}
                    >
                      <Text style={{ color: favoritesOnly ? '#fff' : colors.red, fontSize: 13, fontWeight: '700' }}>♥ My stores</Text>
                    </Pressable>
                  ) : null}
                  {user && user.role === 'customer' && user.favoriteProducts && user.favoriteProducts.length > 0 ? (
                    <Pressable
                      onPress={() => setSavedOnly(!savedOnly)}
                      style={{
                        borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 5, marginRight: 8,
                        backgroundColor: savedOnly ? colors.red : colors.surface,
                        borderColor: colors.red,
                      }}
                    >
                      <Text style={{ color: savedOnly ? '#fff' : colors.red, fontSize: 13, fontWeight: '700' }}>♥ Saved</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
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

            <View style={{ paddingHorizontal: spacing.m, marginTop: spacing.m }}>
              {(featured.length > 0 || featuredBiz.length > 0) && !query && !category && !favoritesOnly && !savedOnly ? (
                <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: colors.navy, paddingVertical: spacing.m, paddingLeft: spacing.m, marginBottom: spacing.l }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingRight: spacing.m, marginBottom: spacing.s }}>
                    <Text style={{ fontWeight: '800', fontSize: 17 }}>Featured</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Hand-picked on Prointeractive</Text>
                  </View>
                  {featuredBiz.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingRight: spacing.m, marginBottom: featured.length > 0 ? spacing.s : 0 }}>
                      {featuredBiz.map((b) => (
                        <Pressable
                          key={b._id}
                          onPress={() => navigation.navigate('Business', { id: b._id })}
                          style={{
                            flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1.5,
                            borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 5,
                            marginRight: 8, marginBottom: 8,
                          }}
                        >
                          {b.logoUrl ? (
                            <Image source={{ uri: b.logoUrl }} style={{ width: 16, height: 16, borderRadius: 3, marginRight: 5, backgroundColor: '#fff' }} resizeMode="contain" />
                          ) : null}
                          <Text style={{ fontSize: 12, fontWeight: '700' }}>{b.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  {featured.length > 0 ? (
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={featured}
                      keyExtractor={(p) => 'ft-' + p._id}
                      renderItem={({ item }) => (
                        <View style={{ width: 170 }}>
                          <ProductCard product={item} onPress={() => navigation.navigate('Product', { id: item._id })} />
                        </View>
                      )}
                    />
                  ) : null}
                </View>
              ) : null}
              {deals.length > 0 && !query && !category && !favoritesOnly && !savedOnly ? (
                <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: colors.red, paddingVertical: spacing.m, paddingLeft: spacing.m, marginBottom: spacing.l }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingRight: spacing.m, marginBottom: spacing.s }}>
                    <Text style={{ fontWeight: '800', fontSize: 17 }}>Deals 🏷️</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>While they last</Text>
                  </View>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={deals}
                    keyExtractor={(p) => 'dl-' + p._id}
                    renderItem={({ item }) => (
                      <View style={{ width: 170 }}>
                        <ProductCard product={item} onPress={() => navigation.navigate('Product', { id: item._id })} />
                      </View>
                    )}
                  />
                </View>
              ) : null}
              {trending.length > 0 && !query && !category && !favoritesOnly && !savedOnly ? (
                <View style={{ backgroundColor: colors.navySoft, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingVertical: spacing.m, paddingLeft: spacing.m, marginBottom: spacing.l }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingRight: spacing.m, marginBottom: spacing.s }}>
                    <Text style={{ fontWeight: '800', fontSize: 17 }}>Trending 🔥</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Most ordered this month</Text>
                  </View>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={trending}
                    keyExtractor={(p) => 'tr-' + p._id}
                    renderItem={({ item }) => (
                      <View style={{ width: 170 }}>
                        <ProductCard product={item} onPress={() => navigation.navigate('Product', { id: item._id })} />
                      </View>
                    )}
                  />
                </View>
              ) : null}
              {loading ? (
                <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.s, marginBottom: spacing.m }} />
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>No products found</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => navigation.navigate('Product', { id: item._id })} />
        )}
      />
      {showScrollTop ? (
        <Pressable
          onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          style={{
            position: 'absolute', right: spacing.l, bottom: spacing.l,
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
            elevation: 5,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>↑</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
