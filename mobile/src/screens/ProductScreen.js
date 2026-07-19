import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
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
  const [imgIdx, setImgIdx] = useState(0);

  const [refreshing, setRefreshing] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [sendingReview, setSendingReview] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const submitReview = async () => {
    if (!myRating) return Alert.alert('Pick a rating', 'Tap the stars to rate this product.');
    setSendingReview(true);
    try {
      await api(`/products/${id}/reviews`, { method: 'POST', body: { rating: myRating, comment: myComment.trim() } });
      setMyRating(0);
      setMyComment('');
      await load();
    } catch (e) {
      Alert.alert('Could not post review', e.message);
    } finally {
      setSendingReview(false);
    }
  };

  const load = () => Promise.all([
    api(`/products/${id}`).then((d) => {
      setProduct(d.product);
      navigation.setOptions({ title: d.product.name });
    }).catch(() => {}),
    api(`/products/${id}/reviews`).then((d) => setReviews(d.reviews)).catch(() => {}),
  ]);

  useEffect(() => { load(); }, [id]);

  const onRefresh = () => { setRefreshing(true); load().finally(() => setRefreshing(false)); };

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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.l }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={{ aspectRatio: 4 / 3, backgroundColor: product.images && product.images.length > 0 ? '#fff' : colors.navySoft, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
        {product.images && product.images.length > 0 ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const w = Dimensions.get('window').width - spacing.l * 2;
                setImgIdx(Math.round(e.nativeEvent.contentOffset.x / w));
              }}
            >
              {product.images.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={{ width: Dimensions.get('window').width - spacing.l * 2, height: '100%' }}
                  resizeMode="contain"
                />
              ))}
            </ScrollView>
            {product.images.length > 1 ? (
              <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                {product.images.map((_, i) => (
                  <View key={i} style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.55)',
                  }} />
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 40, fontWeight: '800', color: colors.navy }}>{product.name[0]}</Text>
          </View>
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
        onPress={() => {
          add(product, 1);
          setJustAdded(true);
          setTimeout(() => setJustAdded(false), 3000);
        }}
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

      {user ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: spacing.m, marginTop: spacing.m }}>
          <Text style={{ fontWeight: '700' }}>Write a review</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.s }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Text key={n} onPress={() => setMyRating(n)}
                style={{ fontSize: 28, color: n <= myRating ? colors.red : colors.line }}>
                ★
              </Text>
            ))}
          </View>
          <TextInput
            placeholder="Share your experience (optional)"
            placeholderTextColor={colors.muted}
            value={myComment}
            onChangeText={setMyComment}
            multiline
            style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, marginTop: spacing.s, minHeight: 60 }}
          />
          <Pressable onPress={submitReview} disabled={sendingReview}
            style={{ backgroundColor: colors.navy, opacity: sendingReview ? 0.6 : 1, borderRadius: 8, padding: 12, marginTop: spacing.s }}>
            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
              {sendingReview ? 'Posting…' : 'Post review'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text style={{ color: colors.muted, marginTop: spacing.m, fontSize: 13 }}>Sign in to write a review.</Text>
      )}

      {justAdded ? (
        <View style={{
          position: 'absolute', left: spacing.l, right: spacing.l, bottom: spacing.l,
          backgroundColor: colors.ink, borderRadius: 12, padding: spacing.m,
          flexDirection: 'row', alignItems: 'center',
          shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
        }}>
          {product.images && product.images[0] ? (
            <Image source={{ uri: product.images[0] }} style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: '#fff' }} resizeMode="contain" />
          ) : null}
          <View style={{ flex: 1, marginLeft: spacing.m }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }} numberOfLines={1}>✓ Added to cart</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }} numberOfLines={1}>{product.name}</Text>
          </View>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}
            onPress={() => { setJustAdded(false); navigation.navigate('CartTab'); }}>
            View cart
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
