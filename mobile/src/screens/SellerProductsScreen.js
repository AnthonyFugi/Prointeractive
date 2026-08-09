import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { colors, money, spacing } from '../theme';

const inputStyle = {
  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  borderRadius: 10, padding: 12,
};
const labelStyle = { fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: spacing.m, color: colors.ink };

export default function SellerProductsScreen({ navigation }) {
  const [business, setBusiness] = useState(null);
  const [checked, setChecked] = useState(false);
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Store-setup form state — only used when an account has role 'business'
  // but no Business document exists yet (e.g. an older account, or one
  // where creation failed partway through registration).
  const [biz, setBiz] = useState({ name: '', location: '', phone: '', description: '' });
  const [cats, setCats] = useState([]);
  const [pickedCats, setPickedCats] = useState([]);
  const [creatingBiz, setCreatingBiz] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api('/businesses/mine');
      const mine = d.business;
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

  useEffect(() => {
    if (checked && !business && cats.length === 0) {
      api('/categories').then((d) => setCats(d.categories)).catch(() => {});
    }
  }, [checked, business]);

  const toggleCat = (name) => {
    setPickedCats((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= 3) return prev;
      return [...prev, name];
    });
  };

  const createStore = async () => {
    if (!biz.name.trim()) return Alert.alert('Business name', 'Enter your business name.');
    if (pickedCats.length === 0) return Alert.alert('Category', 'Pick at least one category for your store.');
    setCreatingBiz(true);
    try {
      await api('/businesses', {
        method: 'POST',
        body: {
          name: biz.name.trim(),
          categories: pickedCats,
          location: biz.location.trim(),
          phone: biz.phone.trim(),
          description: biz.description.trim(),
        },
      });
      await load();
    } catch (e) {
      Alert.alert('Could not create store', e.message);
    } finally {
      setCreatingBiz(false);
    }
  };

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
      <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: spacing.l }}>
        <Text style={{ fontWeight: '800', fontSize: 20 }}>Finish setting up your store</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          A few details and your storefront goes live — you can add products right after.
        </Text>

        <Text style={labelStyle}>Business name</Text>
        <TextInput placeholder="e.g. Khah Technology" value={biz.name}
          onChangeText={(v) => setBiz({ ...biz, name: v })} style={inputStyle} />

        <Text style={labelStyle}>
          Categories <Text style={{ color: colors.muted, fontWeight: '400' }}>(up to 3 — {pickedCats.length}/3)</Text>
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {cats.map((c) => {
            const on = pickedCats.includes(c.name);
            return (
              <Pressable key={c._id} onPress={() => toggleCat(c.name)}
                style={{
                  borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6,
                  borderColor: on ? colors.navy : colors.line,
                  backgroundColor: on ? colors.navy : colors.surface,
                }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: on ? '#fff' : colors.ink }}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={labelStyle}>Location <Text style={{ color: colors.muted, fontWeight: '400' }}>(optional)</Text></Text>
        <TextInput placeholder="e.g. Lusaka" value={biz.location}
          onChangeText={(v) => setBiz({ ...biz, location: v })} style={inputStyle} />

        <Text style={labelStyle}>Business phone <Text style={{ color: colors.muted, fontWeight: '400' }}>(optional)</Text></Text>
        <TextInput placeholder="09..." keyboardType="phone-pad" value={biz.phone}
          onChangeText={(v) => setBiz({ ...biz, phone: v })} style={inputStyle} />

        <Text style={labelStyle}>Short description <Text style={{ color: colors.muted, fontWeight: '400' }}>(optional)</Text></Text>
        <TextInput placeholder="What do you sell?" multiline value={biz.description}
          onChangeText={(v) => setBiz({ ...biz, description: v })} style={[inputStyle, { minHeight: 70 }]} />

        <Pressable onPress={createStore} disabled={creatingBiz}
          style={{ backgroundColor: colors.red, opacity: creatingBiz ? 0.6 : 1, borderRadius: 10, padding: 14, marginTop: spacing.l }}>
          <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>
            {creatingBiz ? 'Creating your store…' : 'Create store'}
          </Text>
        </Pressable>
      </ScrollView>
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
