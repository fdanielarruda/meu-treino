export type WorkoutSummary = { id: string; workoutDate: string; title: string; totalSets: number; completedSets: number };
export type SetRow = { id: string; exerciseName: string; setNumber: number; reps: number; weightKg: number; completed: boolean };
export type Workout = { id: string; workoutDate: string; title: string; sets: SetRow[] };

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  workouts: () => req<WorkoutSummary[]>('/workouts'),
  workout: (id: string) => req<Workout>(`/workouts/${id}`),
  createWorkout: (title: string) => req<{ id: string }>('/workouts', { method: 'POST', body: JSON.stringify({ title }) }),
  deleteWorkout: (id: string) => req<void>(`/workouts/${id}`, { method: 'DELETE' }),
  exercises: () => req<{ id: string; name: string }[]>('/exercises'),
  addSet: (wid: string, s: { exerciseName: string; reps: number; weightKg: number; completed: boolean }) =>
    req(`/workouts/${wid}/sets`, { method: 'POST', body: JSON.stringify(s) }),
  setCompleted: (id: string, completed: boolean) =>
    req<void>(`/sets/${id}`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
  deleteSet: (id: string) => req<void>(`/sets/${id}`, { method: 'DELETE' }),
};

export function groupByExercise(sets: SetRow[]): [string, SetRow[]][] {
  const m = new Map<string, SetRow[]>();
  for (const s of sets) m.set(s.exerciseName, [...(m.get(s.exerciseName) ?? []), s]);
  return [...m];
}
