# Ethernia

Projet Next.js avec React 19, TypeScript, Tailwind CSS v4 et Framer Motion.

## Prérequis

- [Node.js](https://nodejs.org/) v18+ ou [Bun](https://bun.sh/) v1+
- Un gestionnaire de paquets : `npm`, `yarn`, `pnpm` ou `bun`

## Installation

Cloner le dépôt puis installer les dépendances :

```bash
git clone <url-du-repo>
cd ethernia
```

```bash
# npm
npm install

# yarn
yarn install

# pnpm
pnpm install

# bun (recommandé)
bun install
```

## Lancer le serveur de développement

```bash
# npm
npm run dev

# yarn
yarn dev

# pnpm
pnpm dev

# bun
bun dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.

## Build de production

```bash
# Compiler le projet
bun run build

# Lancer le serveur de production
bun run start
```

## Scripts disponibles

| Commande        | Description                          |
| --------------- | ------------------------------------ |
| `dev`           | Serveur de développement (port 3000) |
| `build`         | Compile le projet pour la production |
| `start`         | Lance le serveur de production       |
| `lint`          | Analyse le code avec ESLint          |

## Stack technique

- [Next.js 16](https://nextjs.org/) — Framework React
- [React 19](https://react.dev/) — Librairie UI
- [TypeScript 5](https://www.typescriptlang.org/) — Typage statique
- [Tailwind CSS v4](https://tailwindcss.com/) — Styles utilitaires
- [Framer Motion](https://www.framer.com/motion/) — Animations
