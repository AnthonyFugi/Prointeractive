import { Image, Pressable, Text, View } from 'react-native';
import { colors, money, spacing } from '../theme';
import VerifiedBadge from './VerifiedBadge';

export default function ProductCard({ product, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1, backgroundColor: colors.surface, borderRadius: 10,
        borderWidth: 1, borderColor: colors.line, overflow: 'hidden', margin: spacing.xs,
      }}
    >
      <View style={{ aspectRatio: 4 / 3, backgroundColor: product.images && product.images[0] ? '#fff' : colors.navySoft, alignItems: 'center', justifyContent: 'center' }}>
        {product.images && product.images[0] ? (
          <Image source={{ uri: product.images[0] }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        ) : (
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.navy }}>
            {(product.name && product.name[0] ? product.name[0] : '?').toUpperCase()}
          </Text>
        )}
        {product.onSale ? (
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: colors.red, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>SALE</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: spacing.m }}>
        <Text numberOfLines={1} style={{ fontWeight: '600', color: colors.ink }}>{product.name}</Text>
        {product.business && product.business.name ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, flexShrink: 1 }}>
              {product.business.name}
            </Text>
            {product.business.verified ? <VerifiedBadge size={13} /> : null}
          </View>
        ) : null}
        {product.onSale ? (
          <View>
            <Text style={{ color: colors.muted, fontSize: 12, textDecorationLine: 'line-through' }}>
              {money(product.price, product.currency)}
            </Text>
            <Text style={{ color: colors.red, fontWeight: '800' }}>
              {money(product.effectivePrice, product.currency)}
            </Text>
          </View>
        ) : (
          <Text style={{ color: colors.red, fontWeight: '800', marginTop: 2 }}>
            {money(product.price, product.currency)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
