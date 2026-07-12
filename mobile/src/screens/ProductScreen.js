import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { colors, money, spacing } from '../theme';

export default function ProductScreen({ route, navigation }) {
  const { id } = route.params;
  const { add } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    api(`/products/${id}`).then((d) => {
      setProduct(d.product);
      navigation.setOptions({ title: d.product.name });
    }).catch(() => {});
    api(`/products/${id}/reviews`).then((d) => setReviews(d.reviews)).catch(() => {});
  }, [id]);

  if (!product) return <ActivityIndicator color={colors.navy} style={{ marginTop: 60 }} />;

  const askSeller = async () => {
    if (!user) return navigation.navigate('AccountTab', { screen: 'Login' });
    try {
      await api('/inquiries', {
        method: 'POST',
        body: {
          businessId: product.business._id,
          productId: product._id,
          subject: `About: ${product.name}`,
          message,
        },
      });
      setMessage('');
      setAsking(false);
      Alert.alert('Sent', 'Your question is on its way. Replies land in your Inbox.');
    } catch (e) {
      Alert.alert('Could not send', e.message);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: spacing.l }}>
      <View style={{ aspectRatio: 4 / 3, backgroundColor: colors.navySoft, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {product.images && product.images[0] ? (
          <Image source={{ uri: product.images[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 40, fontWeight: '800', color: colors.navy }}>{product.name[0]}</Text>
        )}
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', marginTop: spacing.l, color: colors.ink }}>{product.name}</Text>
      <Pressable
        onPress={() => navigation.navigate('Business', { id: product.business._id })}
        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
      >
        <Text style={{ color: colors.navy, fontWeight: '600' }}>{product.business.name}</Text>
        {product.business.verified ? <VerifiedBadge size={15} /> : null}
      </Pressable>
      <Text style={{ color: colors.red, fontWeight: '900', fontSize: 24, marginTop: spacing.s }}>
        {money(product.price, product.currency)}
      </Text>
      <Text style={{ color: colors.muted, marginTop: 2 }}>
        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
      </Text>
      {product.description ? <Text style={{ marginTop: spacing.m, lineHeight: 21 }}>{product.description}</Text> : null}

      <Pressable
        disabled={product.stock < 1}
        onPress={() => { add(product, 1); Alert.alert('Added to cart', product.name); }}
        style={{ backgroundColor: product.stock < 1 ? colors.line : colors.red, borderRadius: 10, padding: 14, marginTop: spacing.l }}
      >
        <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>Add to cart</Text>
      </Pressable>
      <Pressable
        onPress={() => setAsking(!asking)}
        style={{ borderWidth: 1.5, borderColor: colors.navy, borderRadius: 10, padding: 14, marginTop: spacing.s }}
      >
        <Text style={{ color: colors.navy, fontWeight: '800', textAlign: 'center' }}>Ask the seller</Text>
      </Pressable>

      {asking ? (
        <View style={{ marginTop: spacing.m }}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Is this available in other sizes?"
            multiline
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, minHeight: 80 }}
          />
          <Pressable onPress={askSeller} style={{ backgroundColor: colors.navy, borderRadius: 10, padding: 12, marginTop: spacing.s }}>
            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Send question</Text>
          </Pressable>
        </View>
      ) : null}

      <Text
        style={{ color: colors.muted, fontSize: 13, textDecorationLine: 'underline', marginTop: spacing.m }}
        onPress={() => {
          const send = async (reason) => {
            try {
              await api('/reports', { method: 'POST', body: { targetType: 'product', targetId: product._id, reason } });
              Alert.alert('Report sent', 'Thanks — this listing will be reviewed.');
            } catch (e) { Alert.alert('Failed', e.message); }
          };
          Alert.alert('Report this listing', 'Why are you reporting it?', [
            { text: 'Spam', onPress: () => send('spam') },
            { text: 'Scam or fraud', onPress: () => send('scam_or_fraud') },
            { text: 'Counterfeit', onPress: () => send('counterfeit') },
            { text: 'Inappropriate', onPress: () => send('inappropriate_content') },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
      >
        Report this listing
      </Text>

      <Text style={{ fontWeight: '800', fontSize: 17, marginTop: spacing.xl }}>Reviews</Text>
      {reviews.length === 0 ? (
        <Text style={{ color: colors.muted, marginTop: 4 }}>No reviews yet.</Text>
      ) : (
        reviews.map((r) => (
          <View key={r._id} style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: spacing.m, marginTop: spacing.s }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '700' }}>{(r.user && r.user.name) || 'Customer'}</Text>
              <Text style={{ color: colors.red }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
            </View>
            {r.comment ? <Text style={{ marginTop: 4 }}>{r.comment}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}
