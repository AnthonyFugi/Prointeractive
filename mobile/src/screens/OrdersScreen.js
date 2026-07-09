import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { colors, money, spacing } from '../theme';

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (!user) return Promise.resolve();
    return api('/orders/mine').then((d) => setOrders(d.orders)).catch(() => {});
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: spacing.l }}>
        <Text style={{ fontWeight: '700' }}>Sign in to see your orders</Text>
        <Pressable onPress={() => navigation.navigate('AccountTab', { screen: 'Login' })}
          style={{ backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: spacing.m }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  const payNow = async (id) => {
    try {
      const d = await api(`/payments/checkout/${id}`, { method: 'POST' });
      await WebBrowser.openBrowserAsync(d.link);
      load();
    } catch (e) {
      Alert.alert('Payment', e.message);
    }
  };

  const cancel = async (id) => {
    try {
      await api(`/orders/${id}/status`, { method: 'PATCH', body: { status: 'cancelled' } });
      load();
    } catch (e) {
      Alert.alert('Cancel', e.message);
    }
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.l }}
      data={orders}
      keyExtractor={(o) => o._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>No orders yet</Text>}
      renderItem={({ item: o }) => (
        <View style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: spacing.l, marginBottom: spacing.s }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', flexShrink: 1 }}>{(o.business && o.business.name) || 'Order'}</Text>
            <StatusBadge status={o.status} />
          </View>
          {o.items.map((i, idx) => (
            <Text key={idx} style={{ color: colors.muted, marginTop: 2, fontSize: 13 }}>
              {i.quantity} × {i.name}
            </Text>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.s }}>
            <Text style={{ color: colors.red, fontWeight: '800' }}>{money(o.totalAmount, o.currency)}</Text>
            {o.status === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {o.paymentMethod !== 'cash_on_delivery' ? (
                  <Pressable onPress={() => payNow(o._id)}
                    style={{ backgroundColor: colors.red, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Pay now</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => cancel(o._id)}
                  style={{ borderWidth: 1.5, borderColor: colors.red, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}>
                  <Text style={{ color: colors.red, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      )}
    />
  );
}
