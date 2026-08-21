import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../theme';
import { usePricing } from '../pricing';

export default function ProductFormScreen({ route, navigation }) {
  const editing = route.params?.product || null;
  const pricing = usePricing();
  // Listings created before commission-inclusive pricing have no basePrice
  // stored yet — fall back to what their current shelf price nets.
  const netOf = (v) => String(Math.round(Number(v) * 0.95 * 100) / 100);
  const [form, setForm] = useState({
    name: editing?.name || '',
    description: editing?.description || '',
    basePrice: editing ? String(editing.basePrice ?? netOf(editing.price)) : '',
    stock: editing ? String(editing.stock) : '',
    category: editing?.category || '',
    images: editing?.images || [],
    baseSalePrice:
      editing?.baseSalePrice != null
        ? String(editing.baseSalePrice)
        : editing?.salePrice != null
        ? netOf(editing.salePrice)
        : '',
    saleEndsAt: editing?.saleEndsAt ? editing.saleEndsAt.slice(0, 10) : '',
  });
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const clearError = (field) =>
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    clearError(field);
  };

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit product' : 'Add product' });
    api('/categories').then((d) => {
      setCategories(d.categories);
      if (!editing && d.categories.length && !form.category) {
        setForm((f) => ({ ...f, category: d.categories[0].name }));
      }
    }).catch(() => {});
  }, []);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access to add product images.');
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      setUploading(true);
      const contentType = asset.mimeType || 'image/jpeg';
      const blob = await (await fetch(asset.uri)).blob();
      const { uploadUrl, publicUrl } = await api('/uploads/presign', {
        method: 'POST',
        body: { contentType, fileSize: blob.size || asset.fileSize || 1 },
      });
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
      if (!put.ok) throw new Error('Upload to storage failed');
      setForm((f) => ({ ...f, images: [...f.images, publicUrl] }));
      clearError('images');
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const fe = {};
    if (!form.name.trim()) fe.name = 'Give the product a name.';
    if (form.basePrice === '' || Number(form.basePrice) <= 0) fe.basePrice = 'Enter how much you want to receive.';
    if (form.stock === '' || Number(form.stock) < 0) fe.stock = 'Enter stock (0 or more).';
    if (!form.category) fe.category = 'Pick a category.';
    if (form.images.length === 0) fe.images = 'Add at least one photo.';
    if (form.baseSalePrice !== '' && !form.saleEndsAt) {
      fe.saleEndsAt = 'Set an end date, or clear the sale amount.';
    }
    if (form.saleEndsAt && form.baseSalePrice === '') {
      fe.baseSalePrice = 'Set a sale amount, or clear the end date.';
    }
    if (form.saleEndsAt && !/^\d{4}-\d{2}-\d{2}$/.test(form.saleEndsAt)) {
      fe.saleEndsAt = 'Use the format YYYY-MM-DD.';
    }
    if (form.baseSalePrice !== '' && Number(form.baseSalePrice) >= Number(form.basePrice)) {
      fe.baseSalePrice = 'Your sale take-home must be lower than your regular take-home.';
    }
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setSaving(true);
    try {
      // Only the seller's target take-home is sent — the server derives the
      // shelf price from it, so the two can never drift apart.
      const body = {
        ...form,
        basePrice: Number(form.basePrice),
        stock: Number(form.stock),
        baseSalePrice: form.baseSalePrice === '' ? null : Number(form.baseSalePrice),
        saleEndsAt: form.saleEndsAt === '' ? null : form.saleEndsAt,
      };
      if (editing) await api(`/products/${editing._id}`, { method: 'PATCH', body });
      else await api('/products', { method: 'POST', body });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  };

  const input = (props) => ({
    style: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginTop: spacing.s },
    placeholderTextColor: colors.muted,
    ...props,
  });
  const Err = ({ k }) => (errors[k] ? <Text style={{ color: colors.red, fontSize: 12, marginTop: 2 }}>{errors[k]}</Text> : null);

  // Live "here's what this actually means" line under a take-home input, so
  // nothing about the arrangement is hidden from the seller.
  const Breakdown = ({ base }) => {
    const n = Number(base);
    if (!base || !Number.isFinite(n) || n <= 0) return null;
    const { listPrice, commission, net } = pricing.breakdown(n);
    return (
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
        Listed at <Text style={{ fontWeight: '700', color: colors.ink }}>K{listPrice.toLocaleString()}</Text>
        {'\n'}Our {pricing.commissionPercent}% commission K{commission.toFixed(2)} · you receive{' '}
        <Text style={{ fontWeight: '700', color: colors.ink }}>K{net.toLocaleString()}</Text>
      </Text>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: spacing.l, paddingBottom: 60 }}>
      <TextInput {...input({ placeholder: 'Product name', value: form.name, onChangeText: (v) => setField('name', v) })} />
      <Err k="name" />
      <TextInput {...input({ placeholder: 'Description', value: form.description, multiline: true, onChangeText: (v) => setForm({ ...form, description: v }) })} style={[input({}).style, { minHeight: 80 }]} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <TextInput {...input({ placeholder: 'You receive (ZMW)', keyboardType: 'decimal-pad', value: form.basePrice, onChangeText: (v) => setField('basePrice', v) })} />
          <Err k="basePrice" />
          <Breakdown base={form.basePrice} />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput {...input({ placeholder: 'Stock', keyboardType: 'number-pad', value: form.stock, onChangeText: (v) => setField('stock', v) })} />
          <Err k="stock" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', marginTop: spacing.l }}>Sale — you receive <Text style={{ color: colors.muted, fontWeight: '400' }}>(optional)</Text></Text>
          <TextInput {...input({ placeholder: 'e.g. 350', keyboardType: 'decimal-pad', value: form.baseSalePrice, onChangeText: (v) => setField('baseSalePrice', v) })} />
          <Err k="baseSalePrice" />
          <Breakdown base={form.baseSalePrice} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', marginTop: spacing.l }}>Sale ends</Text>
          <TextInput {...input({ placeholder: 'YYYY-MM-DD', value: form.saleEndsAt, onChangeText: (v) => setField('saleEndsAt', v) })} />
          <Err k="saleEndsAt" />
        </View>
      </View>
      <Text style={{ fontWeight: '700', marginTop: spacing.l }}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.s }}>
        {categories.map((c) => {
          const on = form.category === c.name;
          return (
            <Pressable key={c._id} onPress={() => setField('category', c.name)}
              style={{
                borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6,
                backgroundColor: on ? colors.navy : colors.surface,
                borderColor: on ? colors.navy : colors.line,
              }}>
              <Text style={{ color: on ? '#fff' : colors.ink, fontSize: 13 }}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Err k="category" />

      <Text style={{ fontWeight: '700', marginTop: spacing.l }}>Photos</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.s }}>
        {form.images.map((url) => (
          <View key={url}>
            <Image source={{ uri: url }} style={{ width: 72, height: 72, borderRadius: 8 }} />
            <Pressable onPress={() => setForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }))}
              style={{ position: 'absolute', top: -6, right: -6, backgroundColor: colors.red, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✕</Text>
            </Pressable>
          </View>
        ))}
        <Pressable onPress={pickImage} disabled={uploading}
          style={{ width: 72, height: 72, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
          {uploading ? <ActivityIndicator color={colors.navy} /> : <Text style={{ fontSize: 24, color: colors.muted }}>＋</Text>}
        </Pressable>
      </View>
      <Err k="images" />

      <Text style={{ color: colors.muted, fontSize: 12, marginTop: spacing.l }}>
        By listing, you confirm this product is new, first-owner, and authentic, per our Product
        Standards (prointapp.com/product-standards).
      </Text>
      <Pressable onPress={save} disabled={saving || uploading}
        style={{ backgroundColor: colors.red, opacity: saving || uploading ? 0.6 : 1, borderRadius: 10, padding: 14, marginTop: spacing.xl }}>
        <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
