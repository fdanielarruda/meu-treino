import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { routes } from './routes.js';

const app = Fastify({ logger: true });

app.setErrorHandler((err: Error, _req, reply) => {
  if (err.name === 'ZodError' || 'issues' in err) return reply.code(400).send({ error: 'Dados inválidos' });
  app.log.error(err);
  return reply.code(500).send({ error: 'Erro interno' });
});

await app.register(cors); // o app mobile e o Vite em dev chamam de outra origem
await app.register(routes, { prefix: '/api' });

// Em produção a própria API serve o site buildado (web/dist), com fallback de SPA.
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist });
  app.setNotFoundHandler((req, reply) =>
    req.url.startsWith('/api/') ? reply.code(404).send({ error: 'Não encontrado' }) : reply.sendFile('index.html'));
}

const port = Number(process.env.PORT ?? 3333);
await app.listen({ port, host: '0.0.0.0' });
