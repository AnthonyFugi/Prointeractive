import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { track } from '../metrics';
import {
  getLocalInterests, setLocalInterests, hasSeenWelcome, markWelcomeSeen, shouldOfferOnboarding,
  getPendingFollows, setPendingFollows, markOnboardingDoneLocally, needsInterestGate,
} from '../interests';

/**
 * First-run welcome, then a two-step interest picker.
 *
 * Presented as a modal over the shop rather than as a blocking route, for the
 * same reason as on web: a product link opened from WhatsApp deep-links
 * straight to the item, and nothing should stand in front of it. Every step
 * can be dismissed.
 *
 * Rendered once, from the shop tab. `onInterestsChanged` lets HomeScreen
 * refetch with the new picks without a full remount.
 */
export default function OnboardingSheet({ onInterestsChanged, navigation }) {
  const { user, refresh } = useAuth();
  const [stage, setStage] = useState(null); // null | 'welcome' | 'categories' | 'stores'
  // When true there is no dismiss on the welcome or category steps — the only
  // ways past are choosing, signing in, or opening a shared link.
  const [gated, setGated] = useState(false);
  const [categories, setCategories] = useState([]);
  const [chosen, setChosen] = useState(new Set());
  const [suggested, setSuggested] = useState([]);
  const [following, setFollowing] = useState(new Set());
  // Signed-out: stores the visitor asked to follow, applied once they sign in.
  const [pending, setPending] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const seen = await hasSeenWelcome();
      const offer = await shouldOfferOnboarding(user);
      const gate = await needsInterestGate(user);
      if (!alive) return;
      setGated(gate);
      if (!seen) { setStage('welcome'); track('welcome_shown'); }
      else if (offer || gate) { setStage('categories'); track(gate ? 'gate_shown' : 'welcome_shown'); }
    })();
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    if (stage !== 'categories' || categories.length) return;
    setLoading(true);
    Promise.all([api('/categories'), getLocalInterests(), getPendingFollows()])
      .then(([d, local, pend]) => {
        setCategories(d.categories || []);
        setChosen(new Set(user?.interests?.length ? user.interests : local));
        setPending(new Set(pend.map((b) => b.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stage, user]);

  const close = async () => { track('welcome_browsed'); await markWelcomeSeen(); setStage(null); };

  const toggle = (name) =>
    setChosen((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const persist = async (list, flags = {}) => {
    if (flags.completed || flags.skipped) await markOnboardingDoneLocally();
    if (flags.completed) track('gate_completed');
    if (flags.skipped) track('gate_skipped');
    await setLocalInterests(list);
    if (!user) return;
    try {
      await api('/auth/onboarding', { method: 'PATCH', body: { interests: list, ...flags } });
      await refresh();
    } catch { /* local copy still drives the feed */ }
  };

  const goToStores = async () => {
    const list = [...chosen];
    setBusy(true);
    try {
      await persist(list);
      const qs = new URLSearchParams({ limit: 6 });
      if (list.length) qs.set('interests', list.join(','));
      const d = await api(`/businesses/suggested?${qs}`);
      setSuggested(d.businesses || []);
      setStage('stores');
    } catch {
      // Suggestions are a nice-to-have. Advance with an empty list rather than
      // stranding the shopper — their interests are already saved.
      setSuggested([]);
      setStage('stores');
    }
    finally { setBusy(false); }
  };

  const toggleFollow = async (b) => {
    if (!user) {
      // Record the intent instead of rejecting the tap — applied on sign-in.
      const on = !pending.has(b._id);
      if (on) track('follow_intent');
      const next = new Set(pending);
      on ? next.add(b._id) : next.delete(b._id);
      setPending(next);
      await setPendingFollows(
        [...next].map((id) => ({ id, name: suggested.find((x) => x._id === id)?.name || '' }))
      );
      return;
    }
    const on = !following.has(b._id);
    setFollowing((prev) => { const n = new Set(prev); on ? n.add(b._id) : n.delete(b._id); return n; });
    try {
      await api(`/businesses/${b._id}/favorite`, { method: 'POST', body: { favorited: on } });
    } catch {
      setFollowing((prev) => { const n = new Set(prev); on ? n.delete(b._id) : n.add(b._id); return n; });
    }
  };

  const finish = async () => {
    setBusy(true);
    const list = [...chosen];
    await persist(list, { completed: true });
    await markWelcomeSeen();
    setBusy(false);
    setGated(false);   // choice made — gate lifted
    onInterestsChanged?.(list);
    setStage(null);
  };

  // Save first, then leave — nothing is lost on the way to the form, and the
  // follows are applied automatically once they're signed in.
  const leaveFor = (screen) => async () => {
    await persist([...chosen], { completed: true });
    await markWelcomeSeen();
    setStage(null);
    navigation?.navigate('AccountTab', { screen });
  };

  const skipPicker = async () => {
    await persist([...chosen], { skipped: true });
    await markWelcomeSeen();
    setStage(null);
  };

  if (!stage) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      // Android hardware back must not slip past the gate.
      onRequestClose={gated ? () => {} : close}
    >
      <View style={s.backdrop}>
        <View style={s.sheet}>
          {stage === 'welcome' && (
            <>
              <Text style={s.title}>Welcome to Prointeractive</Text>
              <Text style={s.sub}>Zambian businesses, in one place.</Text>
              <View style={{ marginVertical: spacing.l, gap: spacing.m }}>
                <Text style={s.bullet}>🛍️  Shop from stores near you.</Text>
                <Text style={s.bullet}>💬  Message a business before you buy.</Text>
                <Text style={s.bullet}>📱  Mobile money, card, or cash on delivery.</Text>
              </View>
              <Pressable style={[s.btn, s.btnRed]} onPress={() => setStage('categories')}>
                <Text style={s.btnRedText}>{gated ? 'Get started' : 'Show me what I like'}</Text>
              </Pressable>
              {!gated && (
                <Pressable style={[s.btn, s.btnGhost]} onPress={close}>
                  <Text style={s.btnGhostText}>Look around first</Text>
                </Pressable>
              )}
            </>
          )}

          {stage === 'categories' && (
            <>
              <Text style={s.title}>What are you shopping for?</Text>
              <Text style={s.sub}>Pick a few and we'll put those first.</Text>
              {loading ? (
                <ActivityIndicator color={colors.navy} style={{ marginVertical: spacing.xl }} />
              ) : (
                <ScrollView style={{ maxHeight: 240 }} contentContainerStyle={s.chips}>
                  {categories.map((c) => {
                    const on = chosen.has(c.name);
                    return (
                      <Pressable
                        key={c._id}
                        onPress={() => toggle(c.name)}
                        style={[s.chip, on ? s.chipOn : s.chipOff]}
                      >
                        <Text style={[s.chipText, { color: on ? '#fff' : colors.ink }]}>{c.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              <Pressable
                style={[s.btn, s.btnRed, gated && chosen.size === 0 && { opacity: 0.5 }]}
                onPress={goToStores}
                disabled={busy || (gated && chosen.size === 0)}
              >
                <Text style={s.btnRedText}>
                  {busy ? 'Saving…' : chosen.size ? `Continue with ${chosen.size}` : 'Pick at least one'}
                </Text>
              </Pressable>
              {!gated && (
                <Pressable style={[s.btn, s.btnGhost]} onPress={skipPicker} disabled={busy}>
                  <Text style={s.btnGhostText}>Skip</Text>
                </Pressable>
              )}
            </>
          )}

          {stage === 'stores' && (
            <>
              <Text style={s.title}>Stores you might like</Text>
              <Text style={s.sub}>Follow a few to see their new stock in your feed.</Text>
              <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: spacing.m, paddingVertical: spacing.m }}>
                {suggested.length === 0 ? (
                  <Text style={s.sub}>No stores match those interests just yet — new ones join every week.</Text>
                ) : suggested.map((b) => (
                  <View key={b._id} style={s.bizRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m, flex: 1 }}>
                      {b.logoUrl ? (
                        <Image source={{ uri: b.logoUrl }} style={s.logo} />
                      ) : (
                        <View style={[s.logo, s.logoFallback]}>
                          <Text style={{ fontWeight: '900', color: colors.navy }}>{b.name.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', color: colors.ink }} numberOfLines={1}>{b.name}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                          {(b.categories || []).slice(0, 2).join(' · ') || b.location || 'Zambia'}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => toggleFollow(b)}
                      style={[s.followBtn, (user ? following.has(b._id) : pending.has(b._id)) ? s.followOn : s.followOff]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: (user ? following.has(b._id) : pending.has(b._id)) ? colors.ink : '#fff' }}>
                        {(user ? following.has(b._id) : pending.has(b._id)) ? (user ? 'Following' : 'Selected') : 'Follow'}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
              {note ? <Text style={{ color: colors.muted, fontSize: 12, marginBottom: spacing.s }}>{note}</Text> : null}
              {!user && pending.size > 0 && (
                <View style={s.signInBox}>
                  <Text style={{ fontSize: 13, color: colors.ink, marginBottom: spacing.s }}>
                    {pending.size === 1 ? '1 store selected.' : `${pending.size} stores selected.`}
                    {' '}Sign in and we'll follow {pending.size === 1 ? 'it' : 'them'} for you.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={[s.smallBtn, s.smallBtnNavy]} onPress={leaveFor('Register')}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Create account</Text>
                    </Pressable>
                    <Pressable style={[s.smallBtn, s.smallBtnGhost]} onPress={leaveFor('Login')}>
                      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 13 }}>Sign in</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              <Pressable style={[s.btn, s.btnRed]} onPress={finish} disabled={busy}>
                <Text style={s.btnRedText}>{busy ? 'Saving…' : 'Start shopping'}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,10,40,0.55)', justifyContent: 'center', padding: spacing.l },
  sheet: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.xl },
  title: { fontSize: 21, fontWeight: '800', color: colors.ink },
  sub: { color: colors.muted, fontSize: 13, marginTop: 4 },
  bullet: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: spacing.m },
  chip: { borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipOff: { backgroundColor: colors.surface, borderColor: colors.line },
  chipText: { fontSize: 13, textTransform: 'capitalize' },
  btn: { borderRadius: 10, padding: 14, marginTop: spacing.s },
  btnRed: { backgroundColor: colors.red },
  btnRedText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  btnGhost: { borderWidth: 1.5, borderColor: colors.line },
  btnGhostText: { color: colors.ink, fontWeight: '700', textAlign: 'center' },
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  logo: { width: 40, height: 40, borderRadius: 10 },
  logoFallback: { backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  followBtn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5 },
  followOn: { backgroundColor: 'transparent', borderColor: colors.line },
  followOff: { backgroundColor: colors.navy, borderColor: colors.navy },
  signInBox: { backgroundColor: colors.paper, borderRadius: 10, padding: spacing.m, marginBottom: spacing.s },
  smallBtn: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center', borderWidth: 1.5 },
  smallBtnNavy: { backgroundColor: colors.navy, borderColor: colors.navy },
  smallBtnGhost: { backgroundColor: 'transparent', borderColor: colors.line },
});
