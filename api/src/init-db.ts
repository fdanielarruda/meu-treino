import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST ?? '127.0.0.1',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  multipleStatements: true,
});
await conn.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
await conn.end();
console.log('Banco meu_treino pronto.');
