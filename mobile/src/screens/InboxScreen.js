import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, Pressable, Text, View } from 'react-native';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function InboxScreen({ navigation }) {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    api('/inquiries').then((d) => setInquiries(d.inquiries)).catch(() => {});
  }, [user]));

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: spacing.l }}>
        <Text style={{ fontWeight: '700' }}>Sign in to see your conversations</Text>
        <Pressable onPress={() => navigation.navigate('Login')}
          style={{ backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: spacing.m }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.l }}
      data={inquiries}
      keyExtractor={(i) => i._id}
      ListEmptyComponent={
        <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>
          No conversations yet. Open any product and tap "Ask the seller".
        </Text>
      }
      renderItem={({ item: inq }) => (
        <Pressable
          onPress={() => navigation.navigate('Thread', { id: inq._id })}
          style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: spacing.l, marginBottom: spacing.s }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{inq.subject}</Text>
            <StatusBadge status={inq.status} />
          </View>
          <Text style={{ color: colors.muted, marginTop: 2, fontSize: 13 }}>
            {(inq.business && inq.business.name) || ''} · {inq.messages.length} message{inq.messages.length !== 1 ? 's' : ''}
          </Text>
        </Pressable>
      )}
    />
  );
}
