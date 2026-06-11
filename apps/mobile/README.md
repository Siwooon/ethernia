# Ethernia — lancement mobile

## Prérequis
- Node.js récent
- Expo Go installé sur le téléphone
- Le téléphone et le PC sur le même réseau Wi-Fi

## Installer les dépendances
Depuis le dossier du projet :

```bash
cd apps/mobile
npm ci --ignore-scripts --no-audit --no-fund
```

Si l'installation locale est déjà cassée sur Windows, supprimer `node_modules`, puis relancer `npm install`.

## Lancer en local
```bash
cd apps/mobile
npx expo start -c
```

Scanner le QR code avec Expo Go.

## Vérifier le projet
```bash
cd apps/mobile
npm run typecheck -- --pretty false
npx expo-doctor
```

## Parcours conseillé pour une démo
1. Lancer l'app.
2. Choisir le départ rapide.
3. Déplacer plusieurs héros sur une même case.
4. Déclencher un combat multi-héros.
5. Montrer attaque, compétence, objet, attente et changement de cible.
6. Terminer un combat, ouvrir le sac, puis continuer la run.
