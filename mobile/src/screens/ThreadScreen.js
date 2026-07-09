import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function ThreadScreen({ route }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState(null);
  const [reply, setReply] = useState('');

  const load = useCallback(() => {
    api(`/inquiries/${id}`).then((d) => setInquiry(d.inquiry)).catch(() => {});
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!inquiry) return <ActivityIndicator color={colors.navy} style={{ marginTop: 60 }} />;

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
      <FlatList
        contentContainerStyle={{ padding: spacing.l }}
        data={inquiry.messages}
        keyExtractor={(m, i) => String(i)}
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
