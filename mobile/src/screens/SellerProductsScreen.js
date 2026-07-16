import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { api } from '../api';
import { colors, money, spacing } from '../theme';

export default function SellerProductsScreen({ navigation }) {
  const [business, setBusiness] = useState(null);
  const [checked, setChecked] = useState(false);
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await api('/auth/me');
      const list = await api('/businesses?limit=100');
      const mine = list.businesses.find(
        (b) => b.owner === me.user.id || (b.owner && b.owner._id === me.user.id)
      ) || null;
      setBusiness(mine);
      if (mine) {
        const d = await api(`/products?business=${mine._id}&limit=100&includeInactive=true`);
        setProducts(d.products);
      }
    } catch (e) {} finally {
      setChecked(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load().finally(() => setRefreshing(false)); };

  const deactivate = (p) =>
    Alert.alert('Deactivate product?', `"${p.name}" will disappear from the shop.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate', style: 'destructive',
        onPress: async () => {
          try { await api(`/products/${p._id}`, { method: 'DELETE' }); load(); }
          catch (e) { Alert.alert('Failed', e.message); }
        },
      },
    ]);

  if (checked && !business) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Text style={{ fontWeight: '800', fontSize: 16, textAlign: 'center' }}>Finish your store setup on the web</Text>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.s }}>
          Create your storefront profile at proint.web.app/dashboard — then manage products right here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FlatList
        contentContainerStyle={{ padding: spacing.l, paddingBottom: 90 }}
        data={products}
        keyExtractor={(p) => p._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={checked ? (
          <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>
            No products yet — tap “+ Add product” to list your first one.
          </Text>
        ) : null}
        renderItem={({ item: p }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: spacing.m, marginBottom: spacing.s }}>
            {p.images && p.images[0] ? (
              <Image source={{ uri: p.images[0] }} style={{ width: 52, height: 52, borderRadius: 8, marginRight: spacing.m }} />
            ) : (
              <View style={{ width: 52, height: 52, borderRadius: 8, marginRight: spacing.m, backgroundColor: colors.navySoft }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: p.isActive ? colors.ink : colors.muted }} numberOfLines={1}>
                {p.name}{p.isActive ? '' : '  (hidden)'}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {money(p.price, p.currency)} · {p.stock} in stock
              </Text>
            </View>
            <Pressable onPress={() => navigation.navigate('ProductForm', { product: p, businessId: business._id })}
              style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: colors.navy, fontWeight: '700' }}>Edit</Text>
            </Pressable>
            {p.isActive ? (
              <Pressable onPress={() => deactivate(p)} style={{ paddingHorizontal: 6, paddingVertical: 6 }}>
                <Text style={{ color: colors.red, fontWeight: '700' }}>✕</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={async () => {
                  try {
                    await api(`/products/${p._id}`, { method: 'PATCH', body: { isActive: true } });
                    load();
                  } catch (e) { Alert.alert('Failed', e.message); }
                }}
                style={{ paddingHorizontal: 6, paddingVertical: 6 }}
              >
                <Text style={{ color: colors.navy, fontWeight: '700' }}>Restore</Text>
              </Pressable>
            )}
          </View>
        )}
      />
      {business ? (
        <Pressable
          onPress={() => navigation.navigate('ProductForm', { businessId: business._id })}
          style={{
            position: 'absolute', bottom: 20, right: 20, backgroundColor: colors.red,
            borderRadius: 30, paddingHorizontal: 20, paddingVertical: 14,
            shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
          }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>＋ Add product</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
