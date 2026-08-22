import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { api } from '../api';
// money lives in theme.js on mobile, not api.js as it does on web.
import { colors, money, spacing } from '../theme';

/**
 * "New from stores you follow" — mobile counterpart of the web strip.
 *
 * This existed on web only, which had it backwards: the returning-visitor hook
 * was missing from the platform most shoppers actually use. Same endpoint,
 * same rules.
 *
 * Renders nothing when there's nothing new, rather than an empty state. A
 * standing "no new items" box just advertises a quiet platform.
 */
export default function FollowingNew({ navigation }) {
  const [items, setItems] = useState([]);
  const [unseen, setUnseen] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api('/products/following-new')
      .then((d) => {
        setItems(d.products || []);
        setUnseen(d.unseen || 0);
      })
      .catch(() => {}); // signed out, or following nobody — silently absent
  }, []);

  // Explicit, so merely opening the app doesn't clear a badge nobody read.
  const markSeen = () => {
    setDismissed(true);
    api('/products/following-new?seen=true').catch(() => {});
  };

  if (dismissed || !items.length) return null;

  return (
    <View style={{ marginBottom: spacing.l }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.l, marginBottom: spacing.s,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontWeight: '800', fontSize: 15, color: colors.ink }}>
            New from stores you follow
          </Text>
          {unseen > 0 ? (
            <View style={{ backgroundColor: colors.red, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{unseen}</Text>
            </View>
          ) : null}
        </View>
        <Pressable onPress={markSeen} hitSlop={8}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>Mark seen</Text>
        </Pressable>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={(p) => String(p._id)}
        contentContainerStyle={{ paddingHorizontal: spacing.l, gap: spacing.m }}
        renderItem={({ item: p }) => (
          <Pressable
            onPress={() => navigation.navigate('Product', { id: p._id })}
            style={{ width: 130 }}
          >
            {p.images && p.images[0] ? (
              <Image
                source={{ uri: p.images[0] }}
                style={{ width: 130, height: 105, borderRadius: 10, backgroundColor: colors.line }}
              />
            ) : (
              <View style={{ width: 130, height: 105, borderRadius: 10, backgroundColor: colors.line }} />
            )}
            <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '600', marginTop: 5, color: colors.ink }}>
              {p.name}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11, color: colors.muted }}>
              {p.business && p.business.name}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>
              {money(p.price, p.currency)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
