// Ported 1:1 from the prototype (CircleUp_main_prototype.jsx lines 19–35).
// Keep these in sync with the `brand`/`heart`/`sos` colors in tailwind.config.js.

export const BRAND_PRIMARY = '#2196D6'; // signature sky blue — primary brand accent
export const BRAND_DEEP = '#1976C2'; // deeper blue — gradient end
export const BRAND_AMBER = '#4FB5E8'; // light sky blue — gradient start (name kept for prototype-compat)
export const BRAND_SAGE = '#4A7C59'; // sage green — verified/community accent
export const BRAND_INK = '#1F1B17'; // warm near-black text
export const BRAND_CREAM = '#FAFAFA'; // neutral cream/off-white bg
export const BRAND_INDIGO = '#0E5A8A'; // deep navy accent for city section
export const HEART_RED = '#C8232C'; // anatomical heart crimson
export const SOS_DARK = '#FF0033'; // electric neon red for SOS

// Gradient stops for expo-linear-gradient (`colors` prop), light → signature → deep.
export const IG_GRADIENT_COLORS = [BRAND_AMBER, BRAND_PRIMARY, BRAND_DEEP] as const;
export const IG_GRADIENT_LOCATIONS = [0, 0.55, 1] as const;
// 135deg web gradient ≈ top-left → bottom-right in RN LinearGradient start/end space.
export const IG_GRADIENT_ANGLE = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };

export const RED_GRADIENT_COLORS = ['#FF4D4D', '#FF1744', SOS_DARK] as const;
export const RED_GRADIENT_LOCATIONS = [0, 0.45, 1] as const;
