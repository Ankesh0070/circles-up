import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../shared/api/supabase';

type Alert = { id: string; severity: 'info' | 'warning' | 'critical'; source: string; title: string; body: string | null; created_at: string };

const SEVERITY_STYLE: Record<Alert['severity'], { bg: string; text: string; label: string }> = {
  critical: { bg: '#FEF2F2', text: '#DC2626', label: 'CRITICAL' },
  warning: { bg: '#FFFBEB', text: '#D97706', label: 'WARNING' },
  info: { bg: '#EFF6FF', text: '#2563EB', label: 'INFO' },
};

// Phase 55 — society/police severity-tagged broadcast feed, real-time via
// Supabase Realtime (a police/society admin publishing an alert appears
// instantly, no refresh needed).
export default function SafetyAlertsFeed() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('safety_alerts').select('*').order('created_at', { ascending: false }).limit(20);
    setAlerts(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    const channel = supabase
      .channel('safety-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'safety_alerts' }, (payload) => {
        setAlerts((prev) => [payload.new as Alert, ...(prev ?? [])]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (alerts === null) return null;
  if (alerts.length === 0) {
    return <Text className="text-[12px] text-gray-400 px-1">No safety alerts right now.</Text>;
  }

  return (
    <View className="gap-2">
      {alerts.map((a) => {
        const style = SEVERITY_STYLE[a.severity];
        return (
          <View key={a.id} className="rounded-xl p-3" style={{ backgroundColor: style.bg }}>
            <View className="flex-row items-center gap-2">
              <Text className="text-[10px] font-bold" style={{ color: style.text }}>
                {style.label}
              </Text>
              <Text className="text-[10px] text-gray-500">{a.source === 'police' ? '👮 Police' : '🏢 Society'}</Text>
            </View>
            <Text className="text-[13px] font-semibold text-[#1F1B17] mt-1">{a.title}</Text>
            {a.body && <Text className="text-[12px] text-gray-600 mt-0.5">{a.body}</Text>}
          </View>
        );
      })}
    </View>
  );
}
