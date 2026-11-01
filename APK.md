# Android APK

One workflow with one job, **Build Android APK**, runs for pushes to main or manual dispatch on main. A shared concurrency group cancels superseded builds, so builds cannot run in parallel. Historical workflow runs remain visible in GitHub. The scheduled Dependabot configuration has been removed; existing update PRs and repository-level security automation are separate from this APK workflow.

Commit and push the Android project, Capacitor configuration, package and lock files, source changes and workflow together. After a successful run, open **Releases > Latest Android APK Build** and download `app-debug.apk` directly. The workflow uploads one APK release asset and replaces that same filename on the next successful build. It does not upload Actions artifacts, ZIP bundles, or browser/database test reports, so it does not consume the Actions artifact-storage quota. GitHub may also display its automatically generated source archives on the release page.

The APK bundles the frontend and uses local storage without login or Supabase. It does not need a development server. Android records are separate from the desktop browser's records. PDF and CSV exports use the Android sharing dialog.

This is a debug-signed APK for installation/testing. Production release and stable update signing require a separately managed release keystore. Debug signatures can differ between build environments. Uninstalling the app clears its local records.

## Local build

Use Node 22+, Java 21 and Android SDK 36. The GitHub workflow installs its build tools automatically. See the [Capacitor environment guide](https://capacitorjs.com/docs/getting-started/environment-setup).

Run `npm ci`, then `npm run android:sync`. In the android directory, run `./gradlew assembleDebug` (Windows: `gradlew.bat assembleDebug`). The output is `android/app/build/outputs/apk/debug/app-debug.apk`.

The sync command always builds local mode before copying assets into Android. Keep the application ID `com.nomi.carrycharges` stable for updates. `npm run android:open` opens Android Studio.

This workspace has Java 17; native compilation and device behavior still need confirmation on the GitHub runner or a configured Java 21 Android environment. Web checks and native project synchronization can be verified locally.
