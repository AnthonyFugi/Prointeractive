# Prointeractive — Mobile (Expo / React Native)

Customer app: shop, cart, Flutterwave checkout, order tracking, and business conversations.
Sellers use the web dashboard.

## Run it (tonight, on your phone)

```bash
cd mobile
npm install
npm start          # shows a QR code
```

Install **Expo Go** from the App Store / Play Store, scan the QR (iPhone: Camera app; Android: inside Expo Go). The app loads live with hot reload.

## Point it at your API

Edit `app.json` → `expo.extra.apiUrl`:
- Production: `https://YOUR-SERVICE.onrender.com`
- Local dev: your Mac's LAN IP + backend port, e.g. `http://192.168.1.20:5001`
  (find it: System Settings → Wi-Fi → Details → IP address; phone must be on the same Wi-Fi;
   `localhost` will NOT work — that's the phone itself)

Restart `npm start` after changing it.

## Payments

Checkout opens Flutterwave's hosted page in an in-app browser (mobile money or card).
Confirmation is server-side (webhook + verification), so closing the browser after paying
is fine — the Orders tab reflects `paid` on next focus. Unpaid pending orders show a
**Pay now** retry button.

## Store builds (later)

```bash
npm install -g eas-cli
eas login
eas build --platform android    # .aab for Play Store (or --profile preview for an installable .apk)
eas build --platform ios        # requires an Apple Developer account ($99/yr)
```

## Structure

```
mobile/
├── App.js                  # navigation: bottom tabs + stack
├── app.json                # Expo config; apiUrl lives in extra
└── src/
    ├── api.js              # fetch client; JWT in SecureStore
    ├── config.js, theme.js # API URL + brand tokens (navy/red/paper)
    ├── context/            # Auth (SecureStore), Cart (AsyncStorage)
    ├── components/         # ProductCard, VerifiedBadge, StatusBadge
    └── screens/            # Home, Product, Businesses, Business, Cart,
                            # Checkout, Orders, Inbox, Thread, Login, Register, Account
```
