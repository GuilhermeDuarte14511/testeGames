# Sky Hopper (Flappy-like moderno)

Um jogo web no estilo **Flappy Bird**, construído com **Phaser 3 + TypeScript + Vite**, com arquitetura modular e foco em evolução de gameplay.

## Destaques

- ✅ Personagem com visual de passarinho (asset SVG)
- ✅ Contador de pontuação em tempo real
- ✅ Velocidade progressiva conforme a pontuação aumenta
- ✅ Ranking local (Top 5) persistido em `localStorage`
- ✅ Estrutura separada por domínio (config, constantes, tipos, serviços e cena)

## Stack

- Phaser 3
- TypeScript
- Vite

## Estrutura

- `src/main.ts`: bootstrap do jogo.
- `src/game/config.ts`: configuração do Phaser e escala.
- `src/game/constants.ts`: constantes de gameplay e leaderboard.
- `src/game/types.ts`: tipos de estado e ranking.
- `src/services/ranking.ts`: persistência e ordenação do ranking.
- `src/scenes/GameScene.ts`: loop principal, UI, física, dificuldade e ranking.
- `public/assets/*.svg`: assets visuais (bird, pipe, cloud, sky).

## Rodar localmente

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Controles

- **Espaço**, **clique** ou **toque** para voar.
- Após perder, clique/toque para retornar ao menu.
