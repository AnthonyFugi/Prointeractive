// Expo push notifications — no third-party service, no per-message cost.
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/
export const sendPush = async (token, { title, body, data = {} }) => {
  if (!token || !token.startsWith('ExponentPushToken')) return;
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, sound: 'default', title, body, data }),
    });
    const out = await res.json().catch(() => ({}));
    const status = out?.data?.status || out?.errors?.[0]?.code || 'unknown';
    console.log(`[push ${status}] "${title}" -> ${token.slice(0, 24)}…`);
  } catch (err) {
    console.error('[push failed]', err.message);
  }
};
