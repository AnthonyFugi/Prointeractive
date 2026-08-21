import { useEffect, useState } from 'react';
import LoadingView from '../components/LoadingView';
import { useState as useS } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { colors, spacing } from '../theme';

export default function BusinessScreen({ route, navigation }) {
  const { id } = route.params;
  const { user, refresh } = useAuth();
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [fav, setFav] = useState(null); // null until user known
  const [storeQuery, setStoreQuery] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  // On-platform enquiry. Mirrors the product screen's flow so a shopper can
  // start a conversation from the storefront without going via a product.
  const [asking, setAsking] = useState(false);
  const [askMessage, setAskMessage] = useState('');
  const [sendingAsk, setSendingAsk] = useState(false);

  const messageBusiness = async () => {
    if (!user) return navigation.navigate('AccountTab', { screen: 'Login' });
    if (!askMessage.trim()) return;
    setSendingAsk(true);
    try {
      await api('/inquiries', {
        method: 'POST',
        body: {
          businessId: business._id,
          subject: `Message for ${business.name}`,
          message: askMessage.trim(),
        },
      });
      setAskMessage('');
      setAsking(false);
      Alert.alert('Sent', 'Your message is on its way. Replies land in your Inbox.');
    } catch (e) {
      Alert.alert('Could not send', e.message);
    } finally {
      setSendingAsk(false);
    }
  };

  const load = () => Promise.all([
    api(`/businesses/${id}`).then((d) => setBusiness(d.business)).catch(() => {}),
    api(`/products?business=${id}&limit=100`).then((d) => setProducts(d.products)).catch(() => {}),
  ]);

  useEffect(() => { load(); }, [id]);

  const onRefresh = () => { setRefreshing(true); load().finally(() => setRefreshing(false)); };

  if (!business) return <LoadingView />;

  const isFav = fav !== null
    ? fav
    : !!(user && user.favoriteBusinesses && user.favoriteBusinesses.some((b) => String(b) === String(id)));

  const toggleFav = async () => {
    try {
      await api(`/businesses/${id}/favorite`, { method: 'POST', body: { favorited: !isFav } });
      setFav(!isFav);
      // Sync the shared user object too — without this, the Account screen's
      // Following list has no way to know anything changed, since it only
      // re-fetches when user.favoriteBusinesses itself actually updates.
      refresh?.();
    } catch (e) {
      Alert.alert('Failed', e.message);
    }
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.m, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      data={storeQuery.trim()
        ? products.filter((p) => {
            const q = storeQuery.trim().toLowerCase();
            return (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
          })
        : products}
      numColumns={2}
      keyExtractor={(p) => p._id}
      ListHeaderComponent={
        <View style={{ padding: spacing.s, marginBottom: spacing.s }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {business.logoUrl ? (
                <Image
                  source={{ uri: business.logoUrl }}
                  style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, marginRight: spacing.m }}
                  resizeMode="contain"
                />
              ) : null}
              <Text style={{ fontSize: 22, fontWeight: '800', flexShrink: 1 }}>{business.name}</Text>
            </View>
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
                {isFav ? '✓ Following' : '+ Follow'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setAsking(!asking)}
            style={{
              alignSelf: 'flex-start', marginTop: spacing.m, borderRadius: 999,
              paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5,
              borderColor: colors.navy, backgroundColor: 'transparent',
            }}>
            <Text style={{ color: colors.navy, fontWeight: '700', fontSize: 13 }}>
              {asking ? 'Cancel' : 'Message this business'}
            </Text>
          </Pressable>
          {asking ? (
            <View style={{ marginTop: spacing.m }}>
              <TextInput
                placeholder="What would you like to ask?"
                placeholderTextColor={colors.muted}
                multiline
                value={askMessage}
                onChangeText={setAskMessage}
                style={{
                  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
                  borderRadius: 8, padding: 12, fontSize: 14, color: colors.ink, minHeight: 90,
                  textAlignVertical: 'top',
                }}
              />
              <Pressable
                onPress={messageBusiness}
                disabled={sendingAsk || !askMessage.trim()}
                style={{
                  backgroundColor: colors.navy, borderRadius: 8, padding: 12, marginTop: spacing.s,
                  opacity: sendingAsk || !askMessage.trim() ? 0.6 : 1,
                }}>
                <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
                  {sendingAsk ? 'Sending…' : 'Send message'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {products.length > 3 ? (
            <TextInput
              placeholder="Search in this store…"
              placeholderTextColor={colors.muted}
              value={storeQuery}
              onChangeText={setStoreQuery}
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginTop: spacing.m }}
            />
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
