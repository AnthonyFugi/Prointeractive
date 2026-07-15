import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { colors, spacing } from '../theme';

export default function ProductFormScreen({ route, navigation }) {
  const editing = route.params?.product || null;
  const [form, setForm] = useState({
    name: editing?.name || '',
    description: editing?.description || '',
    price: editing ? String(editing.price) : '',
    stock: editing ? String(editing.stock) : '',
    category: editing?.category || '',
    images: editing?.images || [],
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
      const ImagePicker = await import('expo-image-picker');
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
    if (form.price === '' || Number(form.price) <= 0) fe.price = 'Enter a price greater than 0.';
    if (form.stock === '' || Number(form.stock) < 0) fe.stock = 'Enter stock (0 or more).';
    if (!form.category) fe.category = 'Pick a category.';
    if (form.images.length === 0) fe.images = 'Add at least one photo.';
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setSaving(true);
    try {
      const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: spacing.l, paddingBottom: 60 }}>
      <TextInput {...input({ placeholder: 'Product name', value: form.name, onChangeText: (v) => setField('name', v) })} />
      <Err k="name" />
      <TextInput {...input({ placeholder: 'Description', value: form.description, multiline: true, onChangeText: (v) => setForm({ ...form, description: v }) })} style={[input({}).style, { minHeight: 80 }]} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <TextInput {...input({ placeholder: 'Price (ZMW)', keyboardType: 'decimal-pad', value: form.price, onChangeText: (v) => setField('price', v) })} />
          <Err k="price" />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput {...input({ placeholder: 'Stock', keyboardType: 'number-pad', value: form.stock, onChangeText: (v) => setField('stock', v) })} />
          <Err k="stock" />
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
        Standards (proint.web.app/product-standards).
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
