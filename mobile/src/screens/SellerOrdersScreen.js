import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, Linking, Pressable, RefreshControl, Text, View } from 'react-native';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { colors, money, spacing } from '../theme';

const ONLINE_NEXT = { pending: 'paid', paid: 'shipped', shipped: 'delivered' };
const ONLINE_LABEL = { pending: 'Mark as paid', paid: 'Mark as shipped', shipped: 'Mark as delivered' };
const COD_NEXT = { pending: 'shipped', shipped: 'delivered' };
const COD_LABEL = { pending: 'Mark as shipped', shipped: 'Delivered · cash received' };

const nextFor = (o) => (o.paymentMethod === 'cash_on_delivery' ? COD_NEXT[o.status] : ONLINE_NEXT[o.status]);
const labelFor = (o) => (o.paymentMethod === 'cash_on_delivery' ? COD_LABEL[o.status] : ONLINE_LABEL[o.status]);

export default function SellerOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () => api('/orders/business').then((d) => setOrders(d.orders)).catch(() => {}),
    []
  );
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load().finally(() => setRefreshing(false)); };

  const advance = async (o) => {
    try {
      await api(`/orders/${o._id}/status`, { method: 'PATCH', body: { status: nextFor(o) } });
      load();
    } catch (e) {
      Alert.alert('Update failed', e.message);
    }
  };

  const feesDue = orders
    .filter((o) => o.platformFee && o.platformFee.status === 'due')
    .reduce((s, o) => s + o.platformFee.amount, 0);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.l }}
      data={orders}
      keyExtractor={(o) => o._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={feesDue > 0 ? (
        <View style={{ backgroundColor: colors.redSoft, borderRadius: 10, padding: spacing.l, marginBottom: spacing.m }}>
          <Text style={{ fontWeight: '800', color: colors.red }}>Platform fees due: {money(feesDue)}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
            5% commission on cash-on-delivery and off-platform sales.
          </Text>
        </View>
      ) : null}
      ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>No orders yet</Text>}
      renderItem={({ item: o }) => (
        <View style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: spacing.l, marginBottom: spacing.s }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', flexShrink: 1 }}>{(o.customer && o.customer.name) || 'Customer'}</Text>
            <StatusBadge status={o.status} />
          </View>
          {o.items.map((i, idx) => (
            <Text key={idx} style={{ color: colors.muted, marginTop: 2, fontSize: 13 }}>{i.quantity} × {i.name}</Text>
          ))}
          {o.shippingAddress && (o.shippingAddress.line1 || o.shippingAddress.phone) ? (
            <View style={{ marginTop: spacing.s }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                📍 {[o.shippingAddress.line1, o.shippingAddress.city].filter(Boolean).join(', ')}
              </Text>
              {o.shippingAddress.phone ? (
                <Text style={{ color: colors.navy, fontSize: 13, fontWeight: '700', marginTop: 2 }}
                  onPress={() => Linking.openURL(`tel:${o.shippingAddress.phone}`)}>
                  📞 {o.shippingAddress.phone} — tap to call
                </Text>
              ) : null}
              {o.shippingAddress.note ? (
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>🗒 {o.shippingAddress.note}</Text>
              ) : null}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.s }}>
            <Text style={{ color: colors.red, fontWeight: '800' }}>
              {money(o.totalAmount, o.currency)}
              {o.paymentMethod === 'cash_on_delivery' ? '  · COD' : ''}
            </Text>
            {nextFor(o) ? (
              <Pressable onPress={() => advance(o)}
                style={{ backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{labelFor(o)}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
    />
  );
}
