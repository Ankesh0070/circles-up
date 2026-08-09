// Design tokens for the Stitch "Circle Up" design system
// (docs/stitch-master-prompt.md -> stitch_circle_up_design_system).
//
// The palette is Material-3 shaped: a deep trust-blue primary, a violet
// secondary that only ever appears as the far end of the brand gradient, and
// a very light blue-white canvas that makes white cards read as raised
// without needing borders.
//
// The legacy BRAND_* names are kept and re-pointed at the new values on
// purpose: dozens of screens import them directly, so remapping here moves
// the whole app onto the new palette in one place instead of touching every
// call site (and leaves nothing behind still rendering the old blue).

// ---------------------------------------------------------------------------
// Core palette
// ---------------------------------------------------------------------------
export const PRIMARY = '#006290'; // trust blue — actions, active states, links
export const PRIMARY_BRIGHT = '#007CB4'; // hover/pressed + lighter accents
export const SECONDARY = '#8127CF'; // violet — gradient end, never used alone
export const SECONDARY_BRIGHT = '#9C48EA';
export const TERTIARY = '#B10E6B'; // magenta — sparing accent (story rings)

export const BACKGROUND = '#F6F9FF'; // app canvas — a hair cooler than white
export const SURFACE = '#FFFFFF'; // cards, sheets, bars
export const SURFACE_LOW = '#F0F4F9'; // subtle inset panels
export const SURFACE_CONTAINER = '#EBEEF4'; // chips, inactive segmented bg
export const SURFACE_VARIANT = '#DFE3E8';

export const ON_SURFACE = '#181C20'; // primary text
export const ON_SURFACE_MUTED = '#6F7881'; // secondary text / inactive icons
export const OUTLINE = '#6F7881';
export const OUTLINE_VARIANT = '#BEC7D1'; // input borders, dividers

export const ERROR = '#BA1A1A';
export const ERROR_CONTAINER = '#FFDAD6';
export const SUCCESS = '#10B981';
export const WARNING = '#F59E0B';

// Safety red is RESERVED for Circle Guard / SOS. Style-guide rule #1: if this
// shows up in ordinary UI, the SOS button stops reading as urgent.
export const SOS_RED = '#FF0033';

// ---------------------------------------------------------------------------
// Brand gradient (blue -> violet). Used ONLY for: the logo wordmark, primary
// CTAs, and unviewed story rings.
// ---------------------------------------------------------------------------
export const IG_GRADIENT_COLORS = [PRIMARY, '#4A47B8', SECONDARY] as const;
export const IG_GRADIENT_LOCATIONS = [0, 0.55, 1] as const;
export const IG_GRADIENT_ANGLE = { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };

// Story rings run a touch warmer so they read apart from CTA buttons.
export const STORY_GRADIENT_COLORS = [PRIMARY, SECONDARY, TERTIARY] as const;

export const RED_GRADIENT_COLORS = ['#FF4D4D', '#FF1744', SOS_RED] as const;
export const RED_GRADIENT_LOCATIONS = [0, 0.45, 1] as const;

// ---------------------------------------------------------------------------
// Shape & elevation. The design's signature is soft shadows and no hard
// borders — cards float on the tinted canvas rather than being outlined.
// ---------------------------------------------------------------------------
export const RADIUS = {
  chip: 999, // pills
  input: 28, // fully-rounded inputs (design uses pill inputs, not boxes)
  card: 16,
  hero: 24, // hero cards + bottom sheets
} as const;

export const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

export const FLOAT_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const;

// ---------------------------------------------------------------------------
// Legacy aliases — kept so existing imports keep compiling, re-pointed at the
// new palette so they render the new design.
// ---------------------------------------------------------------------------
export const BRAND_PRIMARY = PRIMARY;
export const BRAND_DEEP = SECONDARY;
export const BRAND_AMBER = PRIMARY_BRIGHT;
export const BRAND_SAGE = SUCCESS;
export const BRAND_INK = ON_SURFACE;
export const BRAND_CREAM = BACKGROUND;
export const BRAND_INDIGO = PRIMARY;
export const HEART_RED = TERTIARY;
export const SOS_DARK = SOS_RED;
