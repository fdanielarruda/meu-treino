import { useCallback, useEffect, useState } from 'react';
import { api, groupByExercise, type Workout, type WorkoutSummary } from './api';

const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

export function App() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <main>
      <header><h1>Meu Treino</h1></header>
      {openId ? <WorkoutScreen id={openId} onBack={() => setOpenId(null)} /> : <ListScreen onOpen={setOpenId} />}
    </main>
  );
}

function ListScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [items, setItems] = useState<WorkoutSummary[] | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => api.workouts().then(setItems).catch(() => setError('Não consegui falar com a API.')), []);
  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id } = await api.createWorkout(title.trim() || 'Treino');
    onOpen(id);
  };

  return (
    <>
      <form onSubmit={create} className="row">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do treino (ex.: Peito e tríceps)" />
        <button className="primary">Novo treino</button>
      </form>
      {error && <p className="error">{error}</p>}
      {items?.length === 0 && <p className="muted">Nenhum treino ainda. Crie o primeiro!</p>}
      <ul className="cards">
        {items?.map((w) => (
          <li key={w.id}>
            <button className="card" onClick={() => onOpen(w.id)}>
              <strong>{w.title}</strong>
              <span className="muted">{fmtDate(w.workoutDate)}</span>
              <span>{w.totalSets} séries · <b className="ok">{w.completedSets} ✓</b> · <b className="fail">{w.totalSets - w.completedSets} ✗</b></span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function WorkoutScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const [w, setW] = useState<Workout | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [exercise, setExercise] = useState('');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');

  const load = useCallback(() => api.workout(id).then(setW), [id]);
  useEffect(() => { load(); api.exercises().then((x) => setNames(x.map((e) => e.name))); }, [load]);

  const add = async (completed: boolean) => {
    if (!exercise.trim()) return;
    await api.addSet(id, { exerciseName: exercise.trim(), reps: Number(reps) || 0, weightKg: Number(weight.replace(',', '.')) || 0, completed });
    setNames((n) => (n.includes(exercise.trim()) ? n : [...n, exercise.trim()]));
    load();
  };
  const toggle = async (sid: string, completed: boolean) => { await api.setCompleted(sid, !completed); load(); };
  const removeSet = async (sid: string) => { await api.deleteSet(sid); load(); };
  const removeWorkout = async () => {
    if (confirm('Apagar este treino inteiro?')) { await api.deleteWorkout(id); onBack(); }
  };

  if (!w) return <p className="muted">Carregando…</p>;
  const groups = groupByExercise(w.sets);
  const done = w.sets.filter((s) => s.completed).length;

  return (
    <>
      <div className="row between">
        <button onClick={onBack}>← Voltar</button>
        <button className="danger" onClick={removeWorkout}>Apagar</button>
      </div>
      <h2>{w.title} <small className="muted">{fmtDate(w.workoutDate)}</small></h2>
      <p>{w.sets.length} séries · <b className="ok">{done} completas</b> · <b className="fail">{w.sets.length - done} falhas</b></p>

      <section className="panel">
        <input list="exs" value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="Exercício (ex.: Supino reto)" />
        <datalist id="exs">{names.map((n) => <option key={n} value={n} />)}</datalist>
        <div className="row">
          <label>Reps<input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} /></label>
          <label>Carga (kg)<input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" /></label>
        </div>
        <div className="row">
          <button className="big ok-bg" onClick={() => add(true)}>✓ Completei</button>
          <button className="big fail-bg" onClick={() => add(false)}>✗ Falhei</button>
        </div>
      </section>

      {groups.map(([name, sets]) => (
        <section key={name} className="group">
          <h3>{name} <small className="muted">{sets.length} {sets.length === 1 ? 'série' : 'séries'}</small></h3>
          <ul className="sets">
            {sets.map((s) => (
              <li key={s.id} className={s.completed ? 'done' : 'failed'}>
                <button className="setbtn" onClick={() => toggle(s.id, s.completed)} title="Tocar para alternar">
                  <b>{s.setNumber}ª</b> {s.reps} reps{s.weightKg > 0 && ` × ${s.weightKg} kg`} {s.completed ? '✓' : '✗'}
                </button>
                <button className="x" onClick={() => removeSet(s.id)} aria-label="Remover série">×</button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
