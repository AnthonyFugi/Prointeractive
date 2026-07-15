import { useEffect, useState } from 'react';
import { useState as useS } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { colors, spacing } from '../theme';

export default function BusinessScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [fav, setFav] = useState(null); // null until user known

  useEffect(() => {
    api(`/businesses/${id}`).then((d) => setBusiness(d.business)).catch(() => {});
    api(`/products?business=${id}&limit=30`).then((d) => setProducts(d.products)).catch(() => {});
  }, [id]);

  if (!business) return <ActivityIndicator color={colors.navy} style={{ marginTop: 60 }} />;

  const isFav = fav !== null
    ? fav
    : !!(user && user.favoriteBusinesses && user.favoriteBusinesses.some((b) => String(b) === String(id)));

  const toggleFav = async () => {
    try {
      await api(`/businesses/${id}/favorite`, { method: 'POST', body: { favorited: !isFav } });
      setFav(!isFav);
    } catch (e) {
      Alert.alert('Failed', e.message);
    }
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.m, paddingBottom: 40 }}
      data={products}
      numColumns={2}
      keyExtractor={(p) => p._id}
      ListHeaderComponent={
        <View style={{ padding: spacing.s, marginBottom: spacing.s }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '800' }}>{business.name}</Text>
            {business.verified ? <VerifiedBadge size={18} /> : null}
          </View>
          <Text style={{ color: colors.muted, marginTop: 2 }}>
            {(business.categories && business.categories.length ? business.categories.join(' · ') : business.category)}{business.location ? ` · ${business.location}` : ''}
          </Text>
          {business.description ? <Text style={{ marginTop: spacing.s }}>{business.description}</Text> : null}
          {user && user.role === 'customer' ? (
            <Pressable onPress={toggleFav}
              style={{
                alignSelf: 'flex-start', marginTop: spacing.m, borderRadius: 999,
                paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5,
                backgroundColor: isFav ? colors.red : 'transparent',
                borderColor: colors.red,
              }}>
              <Text style={{ color: isFav ? '#fff' : colors.red, fontWeight: '700', fontSize: 13 }}>
                {isFav ? '♥ Favorited' : '♡ Add to favorites'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      }
      ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, marginTop: 20 }}>No products listed yet</Text>}
      renderItem={({ item }) => (
        <ProductCard product={{ ...item, business }} onPress={() => navigation.navigate('Product', { id: item._id })} />
      )}
    />
  );
}
