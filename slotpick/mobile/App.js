import { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';

const BASE = process.env.EXPO_PUBLIC_API_URL;
const TOKEN = 'demo'; // replace with token from deep link (expo-linking) or push payload

const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const mock = {
  orderId: 'ORD-48213', address: '12 Station Road, Hanamkonda',
  selectionExpiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
  slots: [1, 2, 3].flatMap((n) => [['09:00','11:00'],['11:00','13:00'],['14:00','16:00'],['16:00','18:00']]
    .map(([start, end], i) => ({ id: `${n}-${i}`, date: day(n), start, end, available: (n + i) % 3 !== 0 })))
};
const api = async (path, opts) => {
  const r = await fetch(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!r.ok) { const e = new Error('fail'); e.status = r.status; throw e; }
  return r.json();
};

function useCountdown(expiresAt) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setMs(Math.max(0, new Date(expiresAt) - Date.now())), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return ms;
}

export default function App() {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [sel, setSel] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const ms = useCountdown(data?.selectionExpiresAt);

  const load = useCallback(async () => {
    try {
      const d = BASE ? await api(`/api/deliveries/${TOKEN}`) : mock;
      setData(d);
      if (d.status === 'scheduled' && d.selectedSlot) {
        setSel(d.selectedSlot); setState('done');
      } else {
        setActiveDay(d.slots[0]?.date); setState('pick');
      }
    } catch (e) { setState(e.status === 410 ? 'expired' : 'error'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (state === 'pick' && data && ms === 0 && new Date(data.selectionExpiresAt) < Date.now()) setState('expired'); }, [ms, state, data]);

  const book = async () => {
    setState('saving');
    try {
      const res = BASE ? await api(`/api/deliveries/${TOKEN}/slot`, { method: 'POST', body: JSON.stringify({ slotId: sel.id }) }) : sel;
      setSel(res); setState('done');
    } catch (e) {
      if (e.status === 410) return setState('expired');
      setSel(null); load();
    }
  };

  if (state === 'loading') return <SafeAreaView style={s.c}><ActivityIndicator /></SafeAreaView>;
  if (state === 'error') return <SafeAreaView style={s.c}><Text style={s.h}>We can’t find this delivery</Text></SafeAreaView>;
  if (state === 'expired') return <SafeAreaView style={s.c}><Text style={s.h}>Time ran out</Text><Text>We’ll deliver in the next available slot and message you the time.</Text></SafeAreaView>;
  if (state === 'done') return <SafeAreaView style={s.c}><Text style={s.h}>Delivery booked</Text><Text style={s.big}>{sel.date}, {sel.start}–{sel.end}</Text></SafeAreaView>;

  const days = [...new Set(data.slots.map((x) => x.date))];
  const mm = String(Math.floor(ms / 60000)).padStart(2, '0'), ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return (
    <SafeAreaView style={s.c}>
      <Text style={s.h}>Pick your delivery time</Text>
      <Text>Order {data.orderId} · {data.address}</Text>
      <Text style={[s.timer, ms < 60000 && { color: '#b3261e' }]}>Slot held for {mm}:{ss}</Text>
      <ScrollView horizontal style={{ flexGrow: 0, marginVertical: 12 }}>
        {days.map((d) => (
          <Pressable key={d} onPress={() => setActiveDay(d)} style={[s.day, d === activeDay && s.on]}><Text>{d}</Text></Pressable>
        ))}
      </ScrollView>
      <View style={s.grid}>
        {data.slots.filter((x) => x.date === activeDay).map((x) => (
          <Pressable key={x.id} disabled={!x.available} onPress={() => setSel(x)}
            style={[s.slot, sel?.id === x.id && s.on, !x.available && { opacity: 0.4 }]}>
            <Text>{x.start}–{x.end}{!x.available ? ' Full' : ''}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable disabled={!sel || state === 'saving'} onPress={book} style={[s.btn, !sel && { opacity: 0.5 }]}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>{sel ? `Book ${sel.start}–${sel.end}` : 'Choose a slot'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 20, paddingTop: 48, backgroundColor: '#f7f9fb' },
  h: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  big: { fontSize: 20, fontWeight: '600', marginTop: 8 },
  timer: { fontSize: 18, fontWeight: '600', color: '#0b7a5c', marginTop: 8 },
  day: { padding: 10, borderWidth: 1, borderColor: '#cfd8e3', borderRadius: 10, marginRight: 8, backgroundColor: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '48%', padding: 14, borderWidth: 1, borderColor: '#cfd8e3', borderRadius: 10, backgroundColor: '#fff', alignItems: 'center' },
  on: { borderColor: '#0b7a5c', borderWidth: 2 },
  btn: { marginTop: 24, backgroundColor: '#0b7a5c', padding: 14, borderRadius: 10, alignItems: 'center' }
});
