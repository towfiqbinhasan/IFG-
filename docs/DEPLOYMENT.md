# Deployment Guide

Five stages. Do them in order:

1. [Supabase](#1-supabase-database-auth-storage): database, auth and storage
2. [GitHub](#2-push-to-github): push the code
3. [Vercel](#3-deploy-to-vercel): the web app at `*.vercel.app`
4. [Capacitor](#4-android-app-with-capacitor): the Android wrapper
5. [Build the APK](#5-build-the-apk): debug and signed release, locally or with GitHub Actions

**Prerequisites:**

- Node.js 20 or newer, npm and git.
- A free account on each of: [Supabase](https://supabase.com), [GitHub](https://github.com) and
  [Vercel](https://vercel.com).
- For **local** APK builds only: Android Studio with JDK 17.

---

## 1. Supabase (database, auth, storage)

1. **Create a project.** Go to <https://supabase.com/dashboard> and click **New project**. Pick a
   region close to your lab and save the database password somewhere safe.
2. **Run the schema.** Open **SQL Editor → New query**, paste the whole of
   `supabase/schema.sql` and click **Run**. This creates:
   - every table, index, RLS policy and trigger
   - the `avatars` (public) and `papers` (private) storage buckets, with their policies
   - the initial admin account and six starter topics

   > To change the admin's starting password, edit `v_pass` in section 6a **before** you run the
   > file. You can also keep `ChangeMe!2024`: the app makes the admin change it on first login.

3. **Lock down sign-ups.** Under **Authentication → Sign In / Providers**:
   - Turn **off** "Allow new users to sign up". Only admins create accounts, through the app.
   - Leave the **Email** provider **enabled**. Login uses `username@lab.local` behind the scenes.
   - "Confirm email" can stay on or off. Accounts created by the admin are confirmed
     automatically.
4. **Optional: password policy.** Under **Authentication → Policies / Passwords**, set the minimum
   length to **8** to match the app.
5. **Copy your keys** from **Project Settings → API Keys** (or **Data API** for the URL):

   | Value | Goes into |
   |---|---|
   | Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
   | `anon` / publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | `service_role` / secret key | `SUPABASE_SERVICE_ROLE_KEY` (**keep it secret**) |

   The legacy JWT keys (`anon`, `service_role`) and the new `sb_publishable_…`/`sb_secret_…`
   keys both work.
6. **Check the seed.** In the SQL Editor, run this query. It should return one row:
   `admin | admin | true`.

   ```sql
   select username, role, must_change_password from public.profiles;
   ```

### Run locally (optional, recommended)

```bash
npm install
cp .env.example .env.local   # paste the three keys
npm run dev
```

Open <http://localhost:3000> and sign in as `admin` / `ChangeMe!2024`. Set a new password, then
create a test member under **Admin → Users**.

---

## 2. Push to GitHub

Create an **empty** repository on GitHub. Don't add a README or a `.gitignore`. Then run:

```bash
cd research-lab-tracker
git init                       # skip if already a repo
git add .
git commit -m "Initial commit: Research Lab Paper Tracker"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.env.local` is git-ignored, so **your keys are never committed**.

---

## 3. Deploy to Vercel

1. Go to <https://vercel.com/new> and import your GitHub repository.
2. Vercel detects the framework as **Next.js**. Keep the defaults for the build command
   (`next build`) and the output directory.
3. Expand **Environment Variables** and add:

   ```
   NEXT_PUBLIC_SUPABASE_URL       = https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY  = <anon key>
   SUPABASE_SERVICE_ROLE_KEY      = <service role key>
   ```

4. Click **Deploy**. After a minute or two the app is live at `https://<project>.vercel.app`.
5. Open the URL, sign in as `admin` and change the password.
6. Optional: add a custom domain under **Project → Settings → Domains**.

Every `git push` to `main` redeploys automatically. **The Android app picks up the changes as
well, with no APK rebuild**, because the APK loads the live Vercel URL.

> **Changing an environment variable later?** Go to **Vercel → Settings → Environment
> Variables**, then **Deployments → ⋯ → Redeploy**.

---

## 4. Android app with Capacitor

### How it works

The app relies on server-side API routes (admin user management uses the secret key) and on live
data, so the APK is a native shell that loads your deployed Vercel URL. It does not bundle a
static export.

- The native splash and icon come from your logo.
- `capacitor-www/index.html` is bundled into the APK. It is shown if the device is offline.
- The `android/` folder is already generated and committed, with release signing pre-wired in
  `android/app/build.gradle`.

### Point the app at your deployment

```bash
# Use YOUR Vercel URL (https, no trailing slash)
export CAP_SERVER_URL=https://your-app.vercel.app      # Windows PowerShell: $env:CAP_SERVER_URL="https://…"
npx cap sync android
```

Re-run `npx cap sync android` whenever you change any of these:

- `capacitor.config.ts`
- the Capacitor plugins
- the icons or splash
- the server URL

### App identity (set once, before the first public release)

In `capacitor.config.ts`:

- `appId`: `com.researchlab.papertracker`. Change it to your own reverse domain. It becomes
  permanent once the app is published on Google Play.
- `appName`: the label shown under the icon.

If you change `appId` after the `android/` folder already exists, the simplest fix is:

```bash
rm -rf android && npx cap add android && npm run android:assets && npx cap sync android
```

Then re-apply the signing block in `android/app/build.gradle`. You can copy it from git history.

### Icons and splash

```bash
npm run icons            # public/logo.svg → assets/*.png + PWA icons
npm run android:assets   # assets/*.png → Android mipmaps & splash drawables
npx cap sync android
```

---

## 5. Build the APK

### Option A: GitHub Actions (no Android Studio needed)

`.github/workflows/android.yml` builds a **debug APK** on every run. If signing secrets are
present, it also builds a **signed release APK + AAB**.

1. **Create a release keystore once, locally,** and keep it safe. **If you lose it you can never
   update the app.**

   ```bash
   keytool -genkeypair -v -keystore release.keystore -alias labtracker \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

   `keytool` ships with any JDK, including the one bundled with Android Studio.

2. Base64-encode the keystore:

   ```bash
   base64 -w0 release.keystore > keystore.b64        # macOS: base64 -i release.keystore -o keystore.b64
   ```

3. In GitHub, open **Repo → Settings → Secrets and variables → Actions**:
   - On the **Variables** tab, add `CAP_SERVER_URL` = `https://your-app.vercel.app`.
   - On the **Secrets** tab, add:
     - `ANDROID_KEYSTORE_BASE64`: the contents of `keystore.b64`
     - `ANDROID_KEYSTORE_PASSWORD`
     - `ANDROID_KEY_ALIAS` (`labtracker` in the command above)
     - `ANDROID_KEY_PASSWORD`
4. Open **Actions → Android APK → Run workflow**, or push a tag: `git tag v1.0.0 && git push --tags`.
5. When the run finishes, download the artifacts from the run page:
   - `lab-tracker-debug-apk`
   - `lab-tracker-release`, which contains `app-release.apk` and `app-release.aab`

The workflow sets `versionCode` to the run number automatically, so each build can install over
the previous one.

### Option B: locally with Android Studio

1. Install [Android Studio](https://developer.android.com/studio). It bundles a suitable JDK and
   the Android SDK.

   > Use JDK **17** (or 21). Much newer JDKs aren't supported by this Gradle version. In Android
   > Studio, check **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle
   > JDK**.

2. Sync and open the project:

   ```bash
   CAP_SERVER_URL=https://your-app.vercel.app npx cap sync android
   npx cap open android         # opens the android/ folder in Android Studio
   ```

3. **Debug APK:** choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**. The output is
   `android/app/build/outputs/apk/debug/app-debug.apk`.
4. **Signed release APK.** Do one of the following:
   - **Option 1: wizard.** In Android Studio, choose **Build → Generate Signed Bundle / APK… →
     APK**, pick your keystore, then choose **release**.
   - **Option 2: configure once, then build from the command line.**
     1. Copy the example file:

        ```bash
        cp android/keystore.properties.example android/keystore.properties
        ```

     2. Put `release.keystore` in `android/` and fill in the passwords in
        `android/keystore.properties`.
     3. Build:

        ```bash
        cd android
        ./gradlew assembleRelease     # → app/build/outputs/apk/release/app-release.apk
        ./gradlew bundleRelease       # → app/build/outputs/bundle/release/app-release.aab (Play Store)
        ```

        On Windows, use `gradlew.bat`.

   `keystore.properties`, `*.keystore` and `*.jks` are git-ignored.

### Install on a phone

- **USB:** enable Developer options and USB debugging on the phone, then run
  `adb install -r app-release.apk`.
- **Direct download:** send the APK to the phone, open it and allow "Install unknown apps".

### Google Play notes

- Upload the **AAB**, not the APK.
- Google Play requires a recent `targetSdkVersion`. Raise `compileSdkVersion` and
  `targetSdkVersion` in `android/variables.gradle` to the level Play currently requires. You may
  also need to upgrade Capacitor (`npm i @capacitor/core@latest @capacitor/android@latest
  @capacitor/cli@latest`, then `npx cap sync`).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Invalid username or password" for the seeded admin | Re-run section 6a of `schema.sql`, or check that `NEXT_PUBLIC_USERNAME_EMAIL_DOMAIN` (default `lab.local`) matches `v_email`. |
| "Database error querying schema" on login | The seed's auth token columns must be `''`, not NULL. Re-run the whole `schema.sql` file, which sets them. |
| Creating users fails with 500 | `SUPABASE_SERVICE_ROLE_KEY` is missing or wrong in Vercel. Fix it and redeploy. |
| Avatar or PDF upload fails | Check that section 5 of `schema.sql` ran: Storage should list the `avatars` and `papers` buckets. |
| APK shows the offline page | `CAP_SERVER_URL` was wrong or empty during `cap sync`. Check `android/app/src/main/assets/capacitor.config.json`. |
| Gradle: "Unsupported class file major version" | Your JDK is too new. Use JDK 17. |
| Changes don't show in the app | Pull to refresh or reopen the app. The PWA service worker never caches pages or API data. |
