import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from './db.js';

const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local
const id = z.string().uuid();

const newWorkout = z.object({
  title: z.string().trim().min(1).max(100).default('Treino'),
  workoutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(today),
});
const newSet = z.object({
  exerciseName: z.string().trim().min(1).max(100),
  reps: z.number().int().min(0).max(1000),
  weightKg: z.number().min(0).max(9999).default(0),
  completed: z.boolean(),
});
const patchSet = z.object({
  completed: z.boolean().optional(),
  reps: z.number().int().min(0).max(1000).optional(),
  weightKg: z.number().min(0).max(9999).optional(),
});

export async function routes(app: FastifyInstance) {
  app.get('/health', async () => {
    await pool.query('select 1');
    return { ok: true };
  });

  app.get('/exercises', async () => {
    const [rows] = await pool.query<RowDataPacket[]>('select id, name from exercises order by name');
    return rows;
  });

  app.get('/workouts', async () => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `select w.id, w.workout_date as workoutDate, w.title,
              count(s.id) as totalSets, cast(coalesce(sum(s.completed), 0) as signed) as completedSets
         from workouts w left join workout_sets s on s.workout_id = w.id
        group by w.id order by w.workout_date desc, w.created_at desc limit 200`,
    );
    return rows.map((r) => ({ ...r, totalSets: Number(r.totalSets), completedSets: Number(r.completedSets) }));
  });

  app.post('/workouts', async (req, reply) => {
    const body = newWorkout.parse(req.body ?? {});
    const wid = randomUUID();
    await pool.query('insert into workouts (id, workout_date, title) values (?, ?, ?)', [wid, body.workoutDate, body.title]);
    return reply.code(201).send({ id: wid, ...body });
  });

  app.get('/workouts/:id', async (req, reply) => {
    const wid = id.parse((req.params as { id: string }).id);
    const [[w]] = await pool.query<RowDataPacket[]>(
      'select id, workout_date as workoutDate, title from workouts where id = ?', [wid]);
    if (!w) return reply.code(404).send({ error: 'Treino não encontrado' });
    const [sets] = await pool.query<RowDataPacket[]>(
      `select s.id, e.name as exerciseName, s.set_number as setNumber, s.reps,
              s.weight_kg as weightKg, s.completed = 1 as completed
         from workout_sets s join exercises e on e.id = s.exercise_id
        where s.workout_id = ? order by s.created_at, s.set_number`, [wid]);
    return { ...w, sets: sets.map((s) => ({ ...s, completed: Boolean(s.completed) })) };
  });

  app.delete('/workouts/:id', async (req, reply) => {
    const wid = id.parse((req.params as { id: string }).id);
    await pool.query('delete from workouts where id = ?', [wid]);
    return reply.code(204).send();
  });

  app.post('/workouts/:id/sets', async (req, reply) => {
    const wid = id.parse((req.params as { id: string }).id);
    const body = newSet.parse(req.body);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[w]] = await conn.query<RowDataPacket[]>('select id from workouts where id = ? for update', [wid]);
      if (!w) { await conn.rollback(); return reply.code(404).send({ error: 'Treino não encontrado' }); }
      let [[ex]] = await conn.query<RowDataPacket[]>('select id from exercises where name = ?', [body.exerciseName]);
      if (!ex) {
        ex = { id: randomUUID() } as RowDataPacket;
        await conn.query('insert into exercises (id, name) values (?, ?)', [ex.id, body.exerciseName]);
      }
      const [[n]] = await conn.query<RowDataPacket[]>(
        'select count(*) as n from workout_sets where workout_id = ? and exercise_id = ?', [wid, ex.id]);
      const sid = randomUUID();
      await conn.query(
        'insert into workout_sets (id, workout_id, exercise_id, set_number, reps, weight_kg, completed) values (?,?,?,?,?,?,?)',
        [sid, wid, ex.id, Number(n.n) + 1, body.reps, body.weightKg, body.completed ? 1 : 0]);
      await conn.commit();
      return reply.code(201).send({ id: sid, setNumber: Number(n.n) + 1 });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  });

  app.patch('/sets/:id', async (req, reply) => {
    const sid = id.parse((req.params as { id: string }).id);
    const b = patchSet.parse(req.body);
    const cols: string[] = [];
    const vals: unknown[] = [];
    if (b.completed !== undefined) { cols.push('completed = ?'); vals.push(b.completed ? 1 : 0); }
    if (b.reps !== undefined) { cols.push('reps = ?'); vals.push(b.reps); }
    if (b.weightKg !== undefined) { cols.push('weight_kg = ?'); vals.push(b.weightKg); }
    if (!cols.length) return reply.code(400).send({ error: 'Nada para atualizar' });
    const [r] = await pool.query<ResultSetHeader>(`update workout_sets set ${cols.join(', ')} where id = ?`, [...vals, sid]);
    return r.affectedRows ? reply.code(204).send() : reply.code(404).send({ error: 'Série não encontrada' });
  });

  app.delete('/sets/:id', async (req, reply) => {
    const sid = id.parse((req.params as { id: string }).id);
    await pool.query('delete from workout_sets where id = ?', [sid]);
    return reply.code(204).send();
  });
}
