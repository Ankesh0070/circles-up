import { useState } from 'react';
import { View, Text, TextInput, Pressable, type KeyboardTypeOptions } from 'react-native';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { SURFACE, ON_SURFACE, ON_SURFACE_MUTED, OUTLINE_VARIANT, PRIMARY, ERROR, RADIUS } from '../theme/tokens';

// Pill-shaped input with an optional leading icon, matching the design's
// auth/form screens. Focus lifts the border to primary; `error` overrides it.
export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  icon: Icon,
  secure,
  error,
  helper,
  multiline,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  maxLength,
  editable = true,
  rightSlot,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  icon?: LucideIcon;
  secure?: boolean;
  error?: string;
  helper?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  editable?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  // Local visibility state so a password field can be revealed without the
  // parent having to own that purely-presentational concern.
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? ERROR : focused ? PRIMARY : OUTLINE_VARIANT;

  return (
    <View>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: ON_SURFACE_MUTED, marginBottom: 8, marginLeft: 4 }}>
          {label}
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 10,
          backgroundColor: SURFACE,
          borderWidth: 1.5,
          borderColor,
          borderRadius: multiline ? RADIUS.card : RADIUS.input,
          paddingHorizontal: 18,
          paddingVertical: multiline ? 14 : 0,
          minHeight: multiline ? 96 : 54,
        }}
      >
        {Icon && <Icon size={18} color={focused ? PRIMARY : ON_SURFACE_MUTED} style={{ marginTop: multiline ? 2 : 0 }} />}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={ON_SURFACE_MUTED}
          secureTextEntry={secure && !revealed}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={editable}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={{
            flex: 1,
            fontSize: 15,
            color: ON_SURFACE,
            paddingVertical: multiline ? 0 : 14,
          }}
        />

        {secure && (
          <Pressable onPress={() => setRevealed((v) => !v)} hitSlop={10}>
            {revealed ? <EyeOff size={18} color={ON_SURFACE_MUTED} /> : <Eye size={18} color={ON_SURFACE_MUTED} />}
          </Pressable>
        )}
        {rightSlot}
      </View>

      {(error || helper) && (
        <Text style={{ fontSize: 12, color: error ? ERROR : ON_SURFACE_MUTED, marginTop: 6, marginLeft: 4 }}>
          {error || helper}
        </Text>
      )}
    </View>
  );
}
