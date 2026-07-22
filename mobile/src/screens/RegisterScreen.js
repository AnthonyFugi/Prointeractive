import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

const inputStyle = {
  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  borderRadius: 10, padding: 12,
};
const labelStyle = { fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: spacing.m, color: colors.ink };

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [role, setRole] = useState('customer');
  const [biz, setBiz] = useState({ name: '', location: '', phone: '', description: '' });
  const [cats, setCats] = useState([]);
  const [pickedCats, setPickedCats] = useState([]);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (role === 'business' && cats.length === 0) {
      api('/categories').then((d) => setCats(d.categories)).catch(() => {});
    }
  }, [role]);

  const toggleCat = (name) => {
    setPickedCats((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= 3) return prev;
      return [...prev, name];
    });
  };

  const submit = async () => {
    if (!accepted) return Alert.alert('Terms & Conditions', 'Please accept the Terms & Conditions to create an account.');
    if (role === 'business') {
      if (!biz.name.trim()) return Alert.alert('Business name', 'Enter your business name.');
      if (pickedCats.length === 0) return Alert.alert('Category', 'Pick at least one category for your store.');
    }
    setBusy(true);
    try {
      await register({ ...form, role, acceptedTerms: true });
      if (role === 'business') {
        try {
          await api('/businesses', {
            method: 'POST',
            body: {
              name: biz.name.trim(),
              categories: pickedCats,
              location: biz.location.trim(),
              phone: biz.phone.trim(),
              description: biz.description.trim(),
            },
          });
          Alert.alert('Store created 🎉', 'Your storefront is live. Add your first products from the Products tab.');
        } catch (e) {
          Alert.alert(
            'Account created — store setup incomplete',
            e.message + '\n\nYou can finish setting up your store from your dashboard on proint.web.app.'
          );
        }
      }
      navigation.popToTop();
    } catch (e) {
      Alert.alert('Could not register', e.message);
    } finally {
      setBusy(false);
    }
  };

  const RoleCard = ({ value, title, sub }) => {
    const on = role === value;
    return (
      <Pressable
        onPress={() => setRole(value)}
        style={{
          flex: 1, borderWidth: 1.5, borderRadius: 12, padding: spacing.m,
          borderColor: on ? colors.navy : colors.line,
          backgroundColor: on ? colors.navy : colors.surface,
        }}
      >
        <Text style={{ fontWeight: '800', color: on ? '#fff' : colors.ink }}>{title}</Text>
        <Text style={{ fontSize: 12, marginTop: 2, color: on ? 'rgba(255,255,255,0.8)' : colors.muted }}>{sub}</Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 26, fontWeight: '800', marginTop: spacing.l }}>Create account</Text>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.l }}>
        <RoleCard value="customer" title="I'm shopping" sub="Browse and buy from businesses" />
        <RoleCard value="business" title="I'm selling" sub="Open a storefront on Prointeractive" />
      </View>

      <Text style={labelStyle}>Full name</Text>
      <TextInput placeholder="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} style={inputStyle} />
      <Text style={labelStyle}>Email</Text>
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email}
        onChangeText={(v) => setForm({ ...form, email: v })} style={inputStyle} />
      <Text style={labelStyle}>Password</Text>
      <TextInput placeholder="Password (8+ characters)" secureTextEntry value={form.password}
        onChangeText={(v) => setForm({ ...form, password: v })} style={inputStyle} />

      {role === 'business' ? (
        <View style={{ marginTop: spacing.l, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.m }}>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>Your store</Text>
          <Text style={labelStyle}>Business name</Text>
          <TextInput placeholder="e.g. Khah Technology" value={biz.name} onChangeText={(v) => setBiz({ ...biz, name: v })} style={inputStyle} />
          <Text style={labelStyle}>
            Categories <Text style={{ color: colors.muted, fontWeight: '400' }}>(up to 3 — {pickedCats.length}/3)</Text>
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cats.map((c) => {
              const on = pickedCats.includes(c.name);
              return (
                <Pressable key={c._id} onPress={() => toggleCat(c.name)}
                  style={{
                    borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6,
                    borderColor: on ? colors.navy : colors.line,
                    backgroundColor: on ? colors.navy : colors.surface,
                  }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: on ? '#fff' : colors.ink }}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={labelStyle}>Location <Text style={{ color: colors.muted, fontWeight: '400' }}>(optional)</Text></Text>
          <TextInput placeholder="e.g. Lusaka" value={biz.location} onChangeText={(v) => setBiz({ ...biz, location: v })} style={inputStyle} />
          <Text style={labelStyle}>Business phone <Text style={{ color: colors.muted, fontWeight: '400' }}>(optional)</Text></Text>
          <TextInput placeholder="09..." keyboardType="phone-pad" value={biz.phone} onChangeText={(v) => setBiz({ ...biz, phone: v })} style={inputStyle} />
          <Text style={labelStyle}>Short description <Text style={{ color: colors.muted, fontWeight: '400' }}>(optional)</Text></Text>
          <TextInput placeholder="What do you sell?" multiline value={biz.description}
            onChangeText={(v) => setBiz({ ...biz, description: v })} style={[inputStyle, { minHeight: 70 }]} />
        </View>
      ) : null}

      <Pressable onPress={() => setAccepted(!accepted)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.l }}>
        <View style={{
          width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, marginRight: 10,
          borderColor: accepted ? colors.navy : colors.line,
          backgroundColor: accepted ? colors.navy : colors.surface,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {accepted ? <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>✓</Text> : null}
        </View>
        <Text style={{ flex: 1, color: colors.muted, fontSize: 13 }}>
          I agree to the{' '}
          <Text style={{ color: colors.navy, fontWeight: '700' }} onPress={() => Linking.openURL('https://proint.web.app/terms')}>Terms & Conditions</Text>
          {' '}and{' '}
          <Text style={{ color: colors.navy, fontWeight: '700' }} onPress={() => Linking.openURL('https://proint.web.app/privacy')}>Privacy Policy</Text>
        </Text>
      </Pressable>

      <Pressable onPress={submit} disabled={busy}
        style={{ backgroundColor: colors.red, opacity: busy ? 0.6 : 1, borderRadius: 12, padding: 16, marginTop: spacing.l }}>
        <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center', fontSize: 16 }}>
          {busy ? 'Creating…' : role === 'business' ? 'Create account & open store' : 'Create account'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
