# Meu Treino

Anote seus treinos na academia: quantas séries você fez em cada exercício e se **completou** ou **falhou** cada uma.

Monorepo (npm workspaces) com 3 apps:

| App | Tecnologia | Pasta |
|---|---|---|
| API | Node + Fastify + TypeScript + MySQL (`mysql2`, `zod`) | `api/` |
| Site (responsivo) | React + Vite + TypeScript | `web/` |
| App de celular | React Native + Expo | `mobile/` |

## Rodando

```bash
npm install
npm run db:init        # cria o banco meu_treino (api/db/schema.sql)
cp api/.env.example api/.env   # ajuste DB_PASSWORD

npm run dev:api        # API em :3333
npm run dev:web        # site em :5173 (proxy /api -> :3333)
npm run dev:mobile     # Expo; defina EXPO_PUBLIC_API_URL em mobile/.env com o IP do PC
```

Produção / dev-hub: `npm run build && PORT=3000 npm start` — a API serve o site buildado e a rota `/api`.

## API

`GET/POST /api/workouts` · `GET/DELETE /api/workouts/:id` · `POST /api/workouts/:id/sets` ·
`PATCH/DELETE /api/sets/:id` · `GET /api/exercises` · `GET /api/health`

Não há autenticação (uso pessoal, rede local).

## Backup

O banco `meu_treino` é exportado automaticamente pelo `~/.local/bin/db-sync` (cron de hora em hora; ele despeja todos os bancos MySQL/Postgres locais para o OneDrive, mantendo 7 dias).
