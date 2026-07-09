import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { colors, spacing } from '../theme';

export default function BusinessScreen({ route, navigation }) {
  const { id } = route.params;
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api(`/businesses/${id}`).then((d) => setBusiness(d.business)).catch(() => {});
    api(`/products?business=${id}&limit=30`).then((d) => setProducts(d.products)).catch(() => {});
  }, [id]);

  if (!business) return <ActivityIndicator color={colors.navy} style={{ marginTop: 60 }} />;

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
            {business.category}{business.location ? ` · ${business.location}` : ''}
          </Text>
          {business.description ? <Text style={{ marginTop: spacing.s }}>{business.description}</Text> : null}
        </View>
      }
      ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, marginTop: 20 }}>No products listed yet</Text>}
      renderItem={({ item }) => (
        <ProductCard product={{ ...item, business }} onPress={() => navigation.navigate('Product', { id: item._id })} />
      )}
    />
  );
}
