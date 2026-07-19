import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Registers this device for push notifications and stores the token server-side.
// Safe to call repeatedly; fails silently (never blocks sign-in).
// NOTE: remote push works in standalone/EAS builds; Expo Go on Android (SDK 53+)
// does not support remote push — test with the preview APK.
export async function registerForPush() {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {}
    );
    if (token) await api('/auth/push-token', { method: 'POST', body: { token } });
  } catch (e) {
    // Expo Go on Android, denied permissions, offline — all non-fatal.
  }
}
