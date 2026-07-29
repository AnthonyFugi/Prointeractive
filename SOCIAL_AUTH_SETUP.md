# Social sign-in setup — Google & Apple

Email/password sign-in is unchanged and always works. Each social provider appears
**only when its client ID is configured**, so nothing breaks while you set these up.

---

## 1 · Google (do this first — 5 minutes)

### Create the OAuth client
1. https://console.cloud.google.com → select/create a project (e.g. "Prointeractive")
2. **APIs & Services → OAuth consent screen** → External → fill app name, support email,
   logo (optional), authorised domain `proint.web.app` → Save
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Prointeractive Web`
   - **Authorised JavaScript origins:**
     - `https://proint.web.app`
     - `http://localhost:5173`
   - Create → copy the **Client ID** (looks like `1234-abc.apps.googleusercontent.com`)
   - Also copy the **Client secret** shown next to it

### Wire it up
| Where | Variable | Value |
|---|---|---|
| Render (backend) | `GOOGLE_CLIENT_ID` | the client ID |
| Render (backend) | `GOOGLE_CLIENT_SECRET` | the client secret |
| `frontend/.env.production` | `VITE_GOOGLE_CLIENT_ID` | the same client ID |
| `frontend/.env.development` | `VITE_GOOGLE_CLIENT_ID` | the same client ID |

Rebuild the frontend and redeploy the backend. The Google button appears under both forms.

> The client secret is needed because we use Google's popup **code flow**, which lets us
> draw our own button so Google and Apple match. The browser only ever receives a
> short-lived auth code; the secret stays on the server.

### Later, for the Android app
Create a second OAuth client (type **Android**), package `com.proint`, with the SHA-1
from `eas credentials` → Android → Keystore. Add it to Render as `GOOGLE_CLIENT_ID_ANDROID`.
The backend already accepts it.

---

## 2 · Apple (needs the paid Apple Developer account)

Apple requires more setup than Google. Three pieces: an App ID, a Services ID, and
domain verification.

### a. App ID (also used by the iOS app)
1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles → Identifiers**
2. Find or create the App ID for **`com.proint`**
3. Tick **Sign In with Apple** → Save

### b. Services ID (this is the *web* client ID)
1. Identifiers → **+** → **Services IDs** → Continue
2. Description: `Prointeractive Web`, Identifier: **`com.proint.web`** → Register
3. Open it → tick **Sign In with Apple** → **Configure**:
   - Primary App ID: `com.proint`
   - **Domains and Subdomains:** `proint.web.app`
   - **Return URLs:** `https://proint.web.app/login`
4. Save. Download the **domain association file** Apple offers.

### c. Domain verification
Apple must see a file at `https://proint.web.app/.well-known/apple-developer-domain-association.txt`.

```bash
mkdir -p frontend/public/.well-known
cp ~/Downloads/apple-developer-domain-association.txt frontend/public/.well-known/
cd frontend && npm run build && firebase deploy --only hosting
```

Then return to the Services ID configuration and click **Verify**.

### d. Wire it up
| Where | Variable | Value |
|---|---|---|
| Render (backend) | `APPLE_CLIENT_ID` | `com.proint.web` (Services ID) |
| Render (backend) | `APPLE_BUNDLE_ID` | `com.proint` (for the iOS app) |
| `frontend/.env.production` | `VITE_APPLE_CLIENT_ID` | `com.proint.web` |
| `frontend/.env.production` | `VITE_APPLE_REDIRECT_URI` | `https://proint.web.app/login` |

Local development note: Apple **does not accept `localhost`** as a domain. The Apple
button therefore only appears on the deployed site — leave the two `VITE_APPLE_*`
variables out of `.env.development` and the button simply won't render locally.

No private key or client secret is needed: the browser returns an identity token
directly, and the backend verifies it against Apple's public keys.

---

## 3 · iOS app (later in the mobile work)

- Install `expo-apple-authentication`; it uses the **bundle ID `com.proint`** as the
  audience, which the backend already accepts via `APPLE_BUNDLE_ID`.
- Apple's App Store Review Guideline **4.8** requires Sign in with Apple in any app that
  offers other third-party sign-in (Google). Ship both buttons together on iOS.
- Apple sends the user's name **only on the first authorisation** — the app must pass it
  through on that first call or it is lost forever. Our `/api/auth/apple` endpoint accepts
  an optional `name` for exactly this reason.

---

## 4 · How accounts link

- A social sign-in whose **verified email matches an existing account** links to that
  account. No duplicates: someone who registered with a password can later use Google or
  Apple, and vice versa.
- A social sign-in with a **new email** creates a customer account.
- Sellers: sign in socially, then use **Sell → become a business** as normal.
- Accounts created socially have no password. If someone tries the password form, they are
  told which button to use instead. They can set a password any time via
  **Forgot password**, since they own the mailbox.
- Apple's "Hide My Email" gives a `@privaterelay.appleid.com` address. It works normally —
  Apple forwards mail — so order and verification emails still arrive.
