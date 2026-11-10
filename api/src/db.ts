import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'meu_treino',
  dateStrings: true, // DATE/DATETIME como string, sem conversão de fuso
  decimalNumbers: true,
  connectionLimit: 10,
});
