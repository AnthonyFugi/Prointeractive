import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { useCart } from '../context/CartContext';
import { colors, money, spacing } from '../theme';

export default function CartScreen({ navigation }) {
  const { items, setQty, total } = useCart();

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Your cart is empty</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>Find something in the Shop tab.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.product._id}
        contentContainerStyle={{ padding: spacing.l }}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: spacing.l, marginBottom: spacing.s }}>
            <View style={{ flexDirection: 'row' }}>
              {item.product.images && item.product.images[0] ? (
                <Image source={{ uri: item.product.images[0] }}
                  style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, marginRight: spacing.m }}
                  resizeMode="contain" />
              ) : (
                <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.navySoft, marginRight: spacing.m }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700' }} numberOfLines={1}>{item.product.name}</Text>
                {item.product.business && item.product.business.name ? (
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                    from {item.product.business.name}
                  </Text>
                ) : null}
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>
                  {money(item.product.price, item.product.currency)} each
                  {typeof item.product.stock === 'number' && item.product.stock <= 5 ? `  ·  only ${item.product.stock} left` : ''}
                </Text>
              </View>
              <Text style={{ color: colors.muted, fontWeight: '700', paddingLeft: 8 }}
                onPress={() => setQty(item.product._id, 0)}>
                ✕
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.s }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable onPress={() => setQty(item.product._id, item.quantity - 1)}
                  style={{ borderWidth: 1.5, borderColor: colors.line, borderRadius: 8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>−</Text>
                </Pressable>
                <Text style={{ fontWeight: '700' }}>{item.quantity}</Text>
                <Pressable onPress={() => setQty(item.product._id, item.quantity + 1)}
                  style={{ borderWidth: 1.5, borderColor: colors.line, borderRadius: 8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>+</Text>
                </Pressable>
              </View>
              <Text style={{ color: colors.red, fontWeight: '800' }}>
                {money(item.product.price * item.quantity, item.product.currency)}
              </Text>
            </View>
          </View>
        )}
      />
      <View style={{ padding: spacing.l, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.m }}>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>Total</Text>
          <Text style={{ color: colors.red, fontWeight: '900', fontSize: 16 }}>{money(total)}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Checkout')}
          style={{ backgroundColor: colors.red, borderRadius: 10, padding: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>Checkout</Text>
        </Pressable>
      </View>
    </View>
  );
}
