# Build APK Android — Ethernia

## 1. Installer EAS CLI
```bash
npm install -g eas-cli
```

## 2. Se connecter
```bash
eas login
```

## 3. Vérifier le projet
```bash
cd apps/mobile
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck -- --pretty false
npx expo-doctor
```

## 4. Générer un APK de test
```bash
cd apps/mobile
npx eas-cli build --platform android --profile preview
```

Le profil `preview` génère un APK installable directement sur téléphone Android.

## 5. Générer un build production
```bash
cd apps/mobile
npx eas-cli build --platform android --profile production
```

Le profil `production` génère un Android App Bundle, plus adapté au Play Store.
