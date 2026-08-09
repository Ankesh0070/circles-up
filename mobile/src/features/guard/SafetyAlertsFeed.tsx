import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../shared/api/supabase';
import { SURFACE, ON_SURFACE, ON_SURFACE_MUTED, RADIUS, CARD_SHADOW } from '../../shared/theme/tokens';

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
    return (
      <Text style={{ fontSize: 13, color: ON_SURFACE_MUTED, paddingHorizontal: 4 }}>No safety alerts right now.</Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {alerts.map((a) => {
        const style = SEVERITY_STYLE[a.severity];
        return (
          <View
            key={a.id}
            style={[
              {
                backgroundColor: SURFACE,
                borderRadius: RADIUS.card,
                padding: 14,
                // Design signature: a solid severity-coloured spine on the
                // leading edge so urgency is readable at a glance.
                borderLeftWidth: 4,
                borderLeftColor: style.text,
              },
              CARD_SHADOW,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: style.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: style.text, letterSpacing: 0.4 }}>
                  {style.label}
                </Text>
              </View>
              <Text style={{ fontSize: 11.5, color: ON_SURFACE_MUTED }}>
                {a.source === 'police' ? '👮 Police' : '🏢 Society'}
              </Text>
            </View>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: ON_SURFACE, marginTop: 8 }}>{a.title}</Text>
            {a.body && <Text style={{ fontSize: 13, color: ON_SURFACE_MUTED, marginTop: 3, lineHeight: 19 }}>{a.body}</Text>}
          </View>
        );
      })}
    </View>
  );
}
