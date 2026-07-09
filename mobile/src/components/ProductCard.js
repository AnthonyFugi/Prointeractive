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
      <View style={{ aspectRatio: 4 / 3, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' }}>
        {product.images && product.images[0] ? (
          <Image source={{ uri: product.images[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.navy }}>
            {(product.name && product.name[0] ? product.name[0] : '?').toUpperCase()}
          </Text>
        )}
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
        <Text style={{ color: colors.red, fontWeight: '800', marginTop: 2 }}>
          {money(product.price, product.currency)}
        </Text>
      </View>
    </Pressable>
  );
}
