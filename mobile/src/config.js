import Constants from 'expo-constants';

// Set in app.json -> expo.extra.apiUrl (your Render URL).
// For local dev against your Mac, use your machine's LAN IP, e.g. http://192.168.1.20:5001
export const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://YOUR-SERVICE.onrender.com';
