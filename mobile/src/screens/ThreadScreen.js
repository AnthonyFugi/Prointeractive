import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function ThreadScreen({ route }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState(null);
  const [reply, setReply] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return api(`/inquiries/${id}`).then((d) => setInquiry(d.inquiry)).catch(() => {});
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!inquiry) return <ActivityIndicator color={colors.navy} style={{ marginTop: 60 }} />;

  const customerId = inquiry.customer && inquiry.customer._id ? inquiry.customer._id : inquiry.customer;
  const iAmCustomer = user && customerId === user.id;
  const otherPartyId = iAmCustomer ? inquiry.business && inquiry.business.owner : customerId;

  const report = () => {
    const send = async (reason) => {
      try {
        await api('/reports', { method: 'POST', body: { targetType: 'inquiry', targetId: inquiry._id, reason } });
        Alert.alert('Report sent', 'Our team will review this conversation.');
      } catch (e) { Alert.alert('Failed', e.message); }
    };
    Alert.alert('Report this conversation', 'Why are you reporting it?', [
      { text: 'Spam', onPress: () => send('spam') },
      { text: 'Scam or fraud', onPress: () => send('scam_or_fraud') },
      { text: 'Abusive messages', onPress: () => send('abusive_content') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const block = () => {
    if (!otherPartyId) return;
    Alert.alert('Block this user?', 'Neither of you will be able to message the other.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive',
        onPress: async () => {
          try {
            await api('/auth/block', { method: 'POST', body: { userId: otherPartyId, blocked: true } });
            Alert.alert('Blocked', 'Messaging in this conversation is now unavailable.');
          } catch (e) { Alert.alert('Failed', e.message); }
        },
      },
    ]);
  };

  const send = async () => {
    if (!reply.trim()) return;
    try {
      await api(`/inquiries/${id}/messages`, { method: 'POST', body: { message: reply } });
      setReply('');
      load();
    } catch (e) {}
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.paper }} keyboardVerticalOffset={90}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, paddingHorizontal: spacing.l, paddingTop: spacing.s }}>
        <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 13 }} onPress={report}>Report</Text>
        {otherPartyId ? (
          <Text style={{ color: colors.red, fontWeight: '700', fontSize: 13 }} onPress={block}>Block</Text>
        ) : null}
      </View>
      <FlatList
        contentContainerStyle={{ padding: spacing.l }}
        data={inquiry.messages}
        keyExtractor={(m, i) => String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item: m }) => {
          const senderId = m.sender && m.sender._id ? m.sender._id : m.sender;
          const mine = user && senderId === user.id;
          return (
            <View style={{
              alignSelf: mine ? 'flex-end' : 'flex-start',
              backgroundColor: mine ? colors.navy : colors.surface,
              borderWidth: mine ? 0 : 1, borderColor: colors.line,
              borderRadius: 14, padding: spacing.m, marginBottom: spacing.s, maxWidth: '80%',
            }}>
              <Text style={{ color: mine ? '#fff' : colors.ink }}>{m.body}</Text>
            </View>
          );
        }}
      />
      {inquiry.status !== 'closed' ? (
        <View style={{ flexDirection: 'row', padding: spacing.m, gap: 8, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.line }}>
          <TextInput
            value={reply}
            onChangeText={setReply}
            placeholder="Reply…"
            style={{ flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
          />
          <Pressable onPress={send} style={{ backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={{ textAlign: 'center', color: colors.muted, padding: spacing.m }}>This conversation is closed.</Text>
      )}
    </KeyboardAvoidingView>
  );
}
