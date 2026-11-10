import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, groupByExercise, type Workout, type WorkoutSummary } from './api';

const OK = '#16a34a';
const FAIL = '#dc2626';
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

export default function App() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>Meu Treino</Text>
        {openId ? <WorkoutScreen id={openId} onBack={() => setOpenId(null)} /> : <ListScreen onOpen={setOpenId} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function ListScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [items, setItems] = useState<WorkoutSummary[] | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.workouts().then(setItems).catch(() => setError('Não consegui falar com a API.'));
  }, []);

  const create = async () => {
    const { id } = await api.createWorkout(title.trim() || 'Treino');
    onOpen(id);
  };

  return (
    <>
      <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Nome do treino (ex.: Peito e tríceps)" />
      <Pressable style={[s.btn, { backgroundColor: '#2563eb' }]} onPress={create}>
        <Text style={s.btnText}>Novo treino</Text>
      </Pressable>
      {!!error && <Text style={{ color: FAIL }}>{error}</Text>}
      {items?.map((w) => (
        <Pressable key={w.id} style={s.card} onPress={() => onOpen(w.id)}>
          <Text style={s.bold}>{w.title}</Text>
          <Text style={s.muted}>{fmtDate(w.workoutDate)}</Text>
          <Text>{w.totalSets} séries · <Text style={{ color: OK }}>{w.completedSets} ✓</Text> · <Text style={{ color: FAIL }}>{w.totalSets - w.completedSets} ✗</Text></Text>
        </Pressable>
      ))}
    </>
  );
}

function WorkoutScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const [w, setW] = useState<Workout | null>(null);
  const [exercise, setExercise] = useState('');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');
  const [names, setNames] = useState<string[]>([]);

  const load = useCallback(() => api.workout(id).then(setW), [id]);
  useEffect(() => { load(); api.exercises().then((x) => setNames(x.map((e) => e.name))); }, [load]);

  const add = async (completed: boolean) => {
    if (!exercise.trim()) return;
    await api.addSet(id, { exerciseName: exercise.trim(), reps: Number(reps) || 0, weightKg: Number(weight.replace(',', '.')) || 0, completed });
    load();
  };
  const removeWorkout = () =>
    Alert.alert('Apagar este treino inteiro?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => { await api.deleteWorkout(id); onBack(); } },
    ]);

  if (!w) return <Text style={s.muted}>Carregando…</Text>;
  const groups = groupByExercise(w.sets);
  const done = w.sets.filter((x) => x.completed).length;
  const suggestions = exercise ? names.filter((n) => n.toLowerCase().includes(exercise.toLowerCase()) && n !== exercise).slice(0, 5) : [];

  return (
    <>
      <View style={s.rowBetween}>
        <Pressable onPress={onBack}><Text style={s.bold}>← Voltar</Text></Pressable>
        <Pressable onPress={removeWorkout}><Text style={{ color: FAIL }}>Apagar</Text></Pressable>
      </View>
      <Text style={s.h2}>{w.title} <Text style={s.muted}>{fmtDate(w.workoutDate)}</Text></Text>
      <Text>{w.sets.length} séries · <Text style={{ color: OK }}>{done} completas</Text> · <Text style={{ color: FAIL }}>{w.sets.length - done} falhas</Text></Text>

      <View style={s.card}>
        <TextInput style={s.input} value={exercise} onChangeText={setExercise} placeholder="Exercício (ex.: Supino reto)" />
        <View style={s.row}>{suggestions.map((n) => (
          <Pressable key={n} style={s.chip} onPress={() => setExercise(n)}><Text>{n}</Text></Pressable>
        ))}</View>
        <View style={s.row}>
          <TextInput style={[s.input, { flex: 1 }]} value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="Reps" />
          <TextInput style={[s.input, { flex: 1 }]} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Carga (kg)" />
        </View>
        <View style={s.row}>
          <Pressable style={[s.btn, { flex: 1, backgroundColor: OK }]} onPress={() => add(true)}><Text style={s.btnText}>✓ Completei</Text></Pressable>
          <Pressable style={[s.btn, { flex: 1, backgroundColor: FAIL }]} onPress={() => add(false)}><Text style={s.btnText}>✗ Falhei</Text></Pressable>
        </View>
      </View>

      {groups.map(([name, sets]) => (
        <View key={name} style={s.card}>
          <Text style={s.bold}>{name} <Text style={s.muted}>{sets.length} {sets.length === 1 ? 'série' : 'séries'}</Text></Text>
          <View style={s.row}>
            {sets.map((x) => (
              <Pressable
                key={x.id}
                style={[s.chip, { borderColor: x.completed ? OK : FAIL, backgroundColor: (x.completed ? OK : FAIL) + '26' }]}
                onPress={async () => { await api.setCompleted(x.id, !x.completed); load(); }}
                onLongPress={() => Alert.alert('Remover série?', undefined, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Remover', style: 'destructive', onPress: async () => { await api.deleteSet(x.id); load(); } },
                ])}
              >
                <Text>{x.setNumber}ª {x.reps} reps{x.weightKg > 0 ? ` × ${x.weightKg} kg` : ''} {x.completed ? '✓' : '✗'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Text style={s.muted}>Toque numa série para alternar ✓/✗; segure para remover.</Text>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 16, gap: 10 },
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 20, fontWeight: '700' },
  bold: { fontWeight: '600', fontSize: 16 },
  muted: { color: '#6b7280', fontSize: 13, fontWeight: '400' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 16 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
});
