import { AlertTriangle, Tag, Star, PartyPopper, HelpCircle, MessageSquare } from 'lucide-react-native';

// Ported 1:1 from the prototype (lines 387–394).
export const categories = [
  { name: 'Alert', value: 'alert', icon: AlertTriangle, color: '#EF4444' },
  { name: 'Buy/Sell', value: 'buy_sell', icon: Tag, color: '#F59E0B' },
  { name: 'Recommend', value: 'recommend', icon: Star, color: '#10B981' },
  { name: 'Event', value: 'event', icon: PartyPopper, color: '#A855F7' },
  { name: 'Lost & Found', value: 'lost_found', icon: HelpCircle, color: '#06B6D4' },
  { name: 'General', value: 'general', icon: MessageSquare, color: '#6B7280' },
] as const;

export type PostCategory = (typeof categories)[number]['value'];

export function categoryMeta(value: string) {
  return categories.find((c) => c.value === value) ?? categories[categories.length - 1];
}
