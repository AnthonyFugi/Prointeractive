import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { colors, money, spacing } from '../theme';

const METHODS = [
  { key: 'mobile_money', label: 'Mobile money' },
  { key: 'card', label: 'Card' },
  { key: 'cash_on_delivery', label: 'Cash on delivery' },
];

export default function CheckoutScreen({ navigation }) {
  const { user } = useAuth();
  const { groups, total, clear } = useCart();
  const [address, setAddress] = useState({ line1: '', city: '', country: 'Zambia', phone: '', note: '' });
  const [method, setMethod] = useState('mobile_money');
  const [busy, setBusy] = useState(false);

  const groupList = Object.values(groups);

  const placeOrders = async () => {
    if (!user) return navigation.navigate('AccountTab', { screen: 'Login' });
    if (!address.line1 || !address.city) return Alert.alert('Missing details', 'Please fill in your delivery address.');
    if (!address.phone) return Alert.alert('Phone needed', 'Add a phone number so the seller can reach you for delivery.');
    setBusy(true);
    try {
      const created = [];
      for (const g of groupList) {
        const d = await api('/orders', {
          method: 'POST',
          body: {
            items: g.items.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
            shippingAddress: address,
            paymentMethod: method,
          },
        });
        created.push(d.order);
      }
      clear();

      if (method !== 'cash_on_delivery' && created.length === 1) {
        const pay = await api(`/payments/checkout/${created[0]._id}`, { method: 'POST' });
        await WebBrowser.openBrowserAsync(pay.link);
      }
      navigation.navigate('OrdersTab');
    } catch (e) {
      Alert.alert('Checkout failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: spacing.l }}>
      {groupList.map((g) => (
        <Text key={g.businessId} style={{ color: colors.muted }}>
          {g.items.length} item{g.items.length > 1 ? 's' : ''} from {g.businessName}
        </Text>
      ))}
      <Text style={{ color: colors.red, fontWeight: '900', fontSize: 20, marginTop: spacing.s }}>{money(total)}</Text>

      <Text style={{ fontWeight: '700', marginTop: spacing.l }}>Delivery address</Text>
      <TextInput placeholder="Address" value={address.line1}
        onChangeText={(v) => setAddress({ ...address, line1: v })}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.s }} />
      <TextInput placeholder="City" value={address.city}
        onChangeText={(v) => setAddress({ ...address, city: v })}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.s }} />
      <TextInput placeholder="Country" value={address.country}
        onChangeText={(v) => setAddress({ ...address, country: v })}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.s }} />
      <TextInput placeholder="Phone number (for the delivery)" keyboardType="phone-pad" value={address.phone}
        onChangeText={(v) => setAddress({ ...address, phone: v })}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.s }} />
      <TextInput placeholder="Delivery note — landmarks, directions (optional)" value={address.note}
        onChangeText={(v) => setAddress({ ...address, note: v })}
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.s }} />

      <Text style={{ fontWeight: '700', marginTop: spacing.l }}>Payment method</Text>
      {METHODS.map((m) => (
        <Pressable key={m.key} onPress={() => setMethod(m.key)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginTop: spacing.s,
            backgroundColor: colors.surface, borderRadius: 10,
            borderWidth: 1.5, borderColor: method === m.key ? colors.navy : colors.line,
          }}>
          <View style={{
            width: 18, height: 18, borderRadius: 9, borderWidth: 2,
            borderColor: method === m.key ? colors.navy : colors.line,
            backgroundColor: method === m.key ? colors.navy : 'transparent',
          }} />
          <Text style={{ fontWeight: '600' }}>{m.label}</Text>
        </Pressable>
      ))}

      <Pressable onPress={placeOrders} disabled={busy}
        style={{ backgroundColor: colors.red, opacity: busy ? 0.6 : 1, borderRadius: 10, padding: 14, marginTop: spacing.xl }}>
        <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>
          {busy ? 'Placing order…' : `Place order · ${money(total)}`}
        </Text>
      </Pressable>
      <Text style={{ color: colors.muted, marginTop: spacing.s, fontSize: 12 }}>
        Mobile money and card payments are processed securely by Flutterwave.
      </Text>
    </ScrollView>
  );
}
