// Frontend-only demo seed data. This replaces the Supabase database for the
// portfolio build — rich, realistic, Bengaluru-neighbourhood content so every
// screen has something to show. Nothing here is persisted; a page refresh
// resets to this seed (that's fine for a demo).

export const ME_ID = 'me';
export const NBHD_ID = 'hsr';

const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();

export const neighbourhoods = [
  { id: NBHD_ID, name: 'HSR Layout', city: 'Bengaluru' },
  { id: 'koramangala', name: 'Koramangala', city: 'Bengaluru' },
  { id: 'indiranagar', name: 'Indiranagar', city: 'Bengaluru' },
];

// The current user's profile. `name`/`username` are patched from the fake-auth
// store at read time (see client.ts) so whatever name they type on login shows
// up everywhere.
export const profiles = [
  {
    id: ME_ID,
    name: 'You',
    username: 'you',
    bio: 'New to the neighbourhood 👋',
    avatar_url: null as string | null,
    vibes: ['Chai Lover', 'Foodie', 'Dog Parent'],
    active_neighbourhood_id: NBHD_ID,
    onboarding_completed: true,
    points: 120,
    created_at: ago(60 * 24 * 30),
    neighbourhood: { id: NBHD_ID, name: 'HSR Layout', city: 'Bengaluru' },
  },
  {
    id: 'u_priya',
    name: 'Priya Sharma',
    username: 'priyas',
    bio: 'Home baker · Sector 2',
    avatar_url: 'https://randomuser.me/api/portraits/women/44.jpg',
    vibes: ['Foodie', 'Baker', 'Chai Lover'],
    active_neighbourhood_id: NBHD_ID,
    onboarding_completed: true,
    points: 340,
    created_at: ago(60 * 24 * 200),
    neighbourhood: { id: NBHD_ID, name: 'HSR Layout', city: 'Bengaluru' },
  },
  {
    id: 'u_arjun',
    name: 'Arjun Menon',
    username: 'arjunm',
    bio: 'Cyclist · Coffee snob · Tower B',
    avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg',
    vibes: ['Cyclist', 'Coffee Snob', 'Runner'],
    active_neighbourhood_id: NBHD_ID,
    onboarding_completed: true,
    points: 210,
    created_at: ago(60 * 24 * 150),
    neighbourhood: { id: NBHD_ID, name: 'HSR Layout', city: 'Bengaluru' },
  },
  {
    id: 'u_fatima',
    name: 'Fatima Khan',
    username: 'fatimak',
    bio: 'Plant mom 🌿 · Sector 7',
    avatar_url: 'https://randomuser.me/api/portraits/women/68.jpg',
    vibes: ['Gardener', 'Reader', 'Tea Person'],
    active_neighbourhood_id: NBHD_ID,
    onboarding_completed: true,
    points: 175,
    created_at: ago(60 * 24 * 90),
    neighbourhood: { id: NBHD_ID, name: 'HSR Layout', city: 'Bengaluru' },
  },
  {
    id: 'u_ravi',
    name: 'Ravi Kulkarni',
    username: 'ravik',
    bio: 'RWA volunteer · Founder, Green HSR',
    avatar_url: 'https://randomuser.me/api/portraits/men/76.jpg',
    vibes: ['Volunteer', 'Runner', 'Gardener'],
    active_neighbourhood_id: NBHD_ID,
    onboarding_completed: true,
    points: 520,
    created_at: ago(60 * 24 * 400),
    neighbourhood: { id: NBHD_ID, name: 'HSR Layout', city: 'Bengaluru' },
  },
  ...([
    ['u_sneha', 'Sneha Iyer', 'snehai', 'Yoga teacher · Sector 4', ['Yogi', 'Reader', 'Tea Person'], 'https://randomuser.me/api/portraits/women/21.jpg'],
    ['u_karan', 'Karan Reddy', 'karanr', 'Weekend cyclist · Photographer', ['Cyclist', 'Photographer', 'Coffee Snob'], 'https://randomuser.me/api/portraits/men/54.jpg'],
    ['u_ananya', 'Ananya Das', 'ananyad', 'Potter & painter · Tower 9', ['Artist', 'Potter', 'Foodie'], 'https://randomuser.me/api/portraits/women/33.jpg'],
    ['u_vikram', 'Vikram Nair', 'vikramn', 'Dad of two · Cricket on Sundays', ['Cricketer', 'Dad', 'Runner'], 'https://randomuser.me/api/portraits/men/91.jpg'],
    ['u_deepa', 'Deepa Rao', 'deepar', 'Home chef · Loves farmers markets', ['Chef', 'Baker', 'Gardener'], 'https://randomuser.me/api/portraits/women/12.jpg'],
    ['u_imran', 'Imran Sheikh', 'imrans', 'Musician · Guitar teacher', ['Musician', 'Guitarist', 'Foodie'], 'https://randomuser.me/api/portraits/men/45.jpg'],
  ] as const).map(([id, name, username, bio, vibes, avatarUrl], i) => ({
    id,
    name,
    username,
    bio,
    avatar_url: avatarUrl as string | null,
    vibes: vibes as unknown as string[],
    active_neighbourhood_id: NBHD_ID,
    onboarding_completed: true,
    points: 150 + i * 45,
    created_at: ago(60 * 24 * (70 + i * 20)),
    neighbourhood: { id: NBHD_ID, name: 'HSR Layout', city: 'Bengaluru' },
  })),
];

const authorOf = (id: string) => {
  const p = profiles.find((x) => x.id === id)!;
  return { name: p.name, avatar_url: p.avatar_url, created_at: p.created_at };
};

// Every post carries a photo — image_urls and media_urls both set (different
// screens read different names, see the `listing()` helper's comment below
// for the same pattern). Photo ids are verified-resolving.
const POST_IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

const basePosts = [
  {
    id: 'p1',
    author_id: 'u_priya',
    neighbourhood_id: NBHD_ID,
    category: 'Recommendations',
    caption:
      'Fresh sourdough and banana bread coming out of my oven this weekend! DM me to reserve a loaf 🍞 Sector 2 pickup.',
    media_urls: [POST_IMG('1509440159596-0249088772ff')],
    image_urls: [POST_IMG('1509440159596-0249088772ff')],
    created_at: ago(35),
    author: authorOf('u_priya'),
    reactions: [
      { user_id: 'u_arjun', type: 'love' },
      { user_id: 'u_fatima', type: 'like' },
      { user_id: 'u_ravi', type: 'like' },
    ],
    comments: [{ id: 'c1' }, { id: 'c2' }],
  },
  {
    id: 'p2',
    author_id: 'u_ravi',
    neighbourhood_id: NBHD_ID,
    category: 'Announcement',
    caption:
      '🌳 Tree-planting drive this Sunday 7 AM at the HSR BDA park. We have 40 saplings — bring gloves and water. Kids welcome!',
    media_urls: [POST_IMG('1416879595882-3373a0480b5b')],
    image_urls: [POST_IMG('1416879595882-3373a0480b5b')],
    created_at: ago(120),
    author: authorOf('u_ravi'),
    reactions: [
      { user_id: 'u_priya', type: 'love' },
      { user_id: 'u_fatima', type: 'love' },
      { user_id: 'u_arjun', type: 'like' },
      { user_id: ME_ID, type: 'like' },
    ],
    comments: [{ id: 'c3' }],
  },
  {
    id: 'p3',
    author_id: 'u_arjun',
    neighbourhood_id: NBHD_ID,
    category: 'Question',
    caption: 'Anyone know a reliable AC servicing guy in HSR? Mine is leaking water. Would appreciate a number 🙏',
    media_urls: [POST_IMG('1581092160607-ee22621dd758')],
    image_urls: [POST_IMG('1581092160607-ee22621dd758')],
    created_at: ago(240),
    author: authorOf('u_arjun'),
    reactions: [{ user_id: 'u_fatima', type: 'like' }],
    comments: [{ id: 'c4' }, { id: 'c5' }, { id: 'c6' }],
  },
  {
    id: 'p4',
    author_id: 'u_fatima',
    neighbourhood_id: NBHD_ID,
    category: 'General',
    caption: 'My monstera finally put out a new leaf 🌿 Giving away free cuttings to anyone starting their plant journey!',
    media_urls: [POST_IMG('1466692476868-aef1dfb1e735')],
    image_urls: [POST_IMG('1466692476868-aef1dfb1e735')],
    created_at: ago(400),
    author: authorOf('u_fatima'),
    reactions: [
      { user_id: 'u_priya', type: 'love' },
      { user_id: ME_ID, type: 'love' },
    ],
    comments: [{ id: 'c7' }],
  },
  {
    id: 'p5',
    author_id: 'u_arjun',
    neighbourhood_id: NBHD_ID,
    category: 'Lost & Found',
    caption: 'FOUND: a set of car keys near the Sector 3 bus stop this morning. Comment if they’re yours 🔑',
    media_urls: [POST_IMG('1582139329536-e7284fece509')],
    image_urls: [POST_IMG('1582139329536-e7284fece509')],
    created_at: ago(600),
    author: authorOf('u_arjun'),
    reactions: [{ user_id: 'u_ravi', type: 'like' }],
    comments: [],
  },
  {
    id: 'p6',
    author_id: 'u_priya',
    neighbourhood_id: NBHD_ID,
    category: 'Recommendations',
    caption: 'The new filter coffee place near 27th Main is SO good. ₹40 a cup, proper Mysore style. Go before it gets crowded ☕',
    media_urls: [POST_IMG('1495474472287-4d71bcdd2085')],
    image_urls: [POST_IMG('1495474472287-4d71bcdd2085')],
    created_at: ago(900),
    author: authorOf('u_priya'),
    reactions: [
      { user_id: 'u_arjun', type: 'love' },
      { user_id: 'u_ravi', type: 'like' },
    ],
    comments: [{ id: 'c8' }, { id: 'c9' }],
  },
  {
    id: 'p7',
    author_id: 'u_ravi',
    neighbourhood_id: NBHD_ID,
    category: 'Safety',
    caption: '⚠️ Heads up: a few bike thefts reported near Sector 6 parking this week. Please double-lock and report anything suspicious.',
    media_urls: [POST_IMG('1517649763962-0c623066013b')],
    image_urls: [POST_IMG('1517649763962-0c623066013b')],
    created_at: ago(1500),
    author: authorOf('u_ravi'),
    reactions: [{ user_id: 'u_fatima', type: 'like' }],
    comments: [{ id: 'c10' }],
  },
  {
    id: 'p8',
    author_id: 'u_fatima',
    neighbourhood_id: NBHD_ID,
    category: 'General',
    caption: 'Sunday farmers market at the HSR club is back! Organic veggies, local honey, and someone selling amazing pickles 🥭',
    media_urls: [POST_IMG('1488459716781-31db52582fe9')],
    image_urls: [POST_IMG('1488459716781-31db52582fe9')],
    created_at: ago(2000),
    author: authorOf('u_fatima'),
    reactions: [
      { user_id: 'u_priya', type: 'love' },
      { user_id: 'u_arjun', type: 'like' },
      { user_id: ME_ID, type: 'like' },
    ],
    comments: [],
  },
];

// ---------------------------------------------------------------------------
// 100+ image posts — studio-quality, activity-matched Unsplash photos so the
// feed, profile grids and thumbnails all have real imagery. Each activity's
// photo id is verified-resolving; captions carry the HSR-neighbourhood voice.
// ---------------------------------------------------------------------------
const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

const ACTIVITIES: { img: string; cat: string; cap: string }[] = [
  { img: '1509440159596-0249088772ff', cat: 'recommend', cap: 'Fresh cinnamon rolls straight out of the oven 🥐 DM to reserve a box — Sector 2 pickup.' },
  { img: '1541625602330-2277a4c46182', cat: 'event', cap: 'Sunday ride around Agara Lake done — 22 km, perfect weather 🚴 Join us next weekend!' },
  { img: '1495474472287-4d71bcdd2085', cat: 'recommend', cap: 'The filter coffee at the new place on 27th Main is unreal ☕ ₹40 and proper Mysore style.' },
  { img: '1416879595882-3373a0480b5b', cat: 'general', cap: 'Spent the morning in the community garden 🌱 tomatoes are finally coming in.' },
  { img: '1552674605-db6ffd4facb5', cat: 'event', cap: 'Morning run crew hit 5 km before sunrise 🏃 same time Wednesday if anyone wants in.' },
  { img: '1544367567-0f2fcb009e0b', cat: 'event', cap: 'Rooftop yoga session was so peaceful this morning 🧘 mats extra if you forget yours.' },
  { img: '1513364776144-60967b0f800f', cat: 'general', cap: 'Finished this little canvas over the weekend 🎨 slow mornings hit different.' },
  { img: '1481627834876-b7833e8f5570', cat: 'general', cap: 'Book club pick for the month is done 📖 loved every page. Meet Sunday at the club?' },
  { img: '1450778869180-41d0601e046e', cat: 'general', cap: 'Evening walk with this good boy 🐕 he says hi to the whole block.' },
  { img: '1488459716781-31db52582fe9', cat: 'recommend', cap: 'Farmers market haul today 🥬 organic greens, local honey, the works. Go early!' },
  { img: '1466637574441-749b8f19452f', cat: 'recommend', cap: 'Sunday biryani experiment turned out great 🍚 recipe in comments if anyone wants it.' },
  { img: '1511671782779-c97d3d27a1d4', cat: 'general', cap: 'Late-night riff session 🎸 teaching a beginners class Saturdays if anyone’s keen.' },
  { img: '1466692476868-aef1dfb1e735', cat: 'general', cap: 'My balcony jungle is officially out of control 🌿 free cuttings to anyone starting out.' },
  { img: '1565193566173-7a0ee3dbe261', cat: 'general', cap: 'Wheel-throwing afternoon at the studio 🏺 there’s something meditative about clay.' },
  { img: '1529699211952-734e80c4d42b', cat: 'event', cap: 'Chess evenings are back at the clubhouse ♟️ all levels welcome, Thursdays 6 PM.' },
  { img: '1626224583764-f87db24ac4ea', cat: 'event', cap: 'Badminton doubles on the community court tonight 🏸 need two more players!' },
  { img: '1452587925148-ce544e77e70d', cat: 'general', cap: 'Golden hour on the terrace 📷 HSR skies have been showing off lately.' },
  { img: '1551632811-561732d1e306', cat: 'event', cap: 'Weekend trek to Nandi Hills — sunrise above the clouds ⛰️ planning another soon.' },
  { img: '1544787219-7f47ccb76574', cat: 'general', cap: 'Perfect evening for a cup of adrak chai 🍵 monsoon vibes finally here.' },
  { img: '1668236543090-82eba5ee5976', cat: 'recommend', cap: 'Street food crawl through the block was a win 🌮 that dosa cart near Gate 3, wow.' },
  { img: '1531415074968-036ba1b575da', cat: 'event', cap: 'Sunday gully cricket got competitive 🏏 rematch next week, bring your A game.' },
  { img: '1530103862676-de8c9debad1d', cat: 'general', cap: 'Little one turned five today 🎂 thank you to everyone who dropped by!' },
  { img: '1506126613408-eca07ce68773', cat: 'general', cap: 'Quiet morning meditation before the city wakes up 🧘‍♀️ ten minutes changes the day.' },
  { img: '1470252649378-9c29740c9fa8', cat: 'general', cap: 'Caught the sunrise from the terrace today 🌅 worth the early alarm.' },
  { img: '1524492412937-b28074a5d7da', cat: 'general', cap: 'Morning visit to the temple before the crowds 🛕 calm start to the week.' },
  { img: '1514888286974-6c03e2ca1dba', cat: 'lost_found', cap: 'This cat has been hanging around Tower 7 for two days 🐈 anyone missing her?' },
  { img: '1504148455328-c376907d081c', cat: 'general', cap: 'Built a little bookshelf this weekend 🪚 first woodworking project, hooked already.' },
  { img: '1431324155629-1a6deb1dec8d', cat: 'event', cap: 'Evening football at the ground was electric ⚽ we play Saturdays, come through.' },
  { img: '1508700115892-45ecd05ae2ad', cat: 'event', cap: 'Dance class this weekend was so much fun 💃 beginners batch starting next month.' },
  { img: '1542838132-92c53300491e', cat: 'recommend', cap: 'Sunday flea market was buzzing 🛍️ picked up some gorgeous handmade pottery.' },
  { img: '1526401485004-46910ecc8e51', cat: 'event', cap: 'Picnic at the park with the block families 🧺 potluck next Sunday, all welcome!' },
  { img: '1530549387789-4c1017266635', cat: 'general', cap: 'Early morning laps at the community pool 🏊 best way to beat the heat.' },
  { img: '1493225457124-a3eb161ffa5f', cat: 'event', cap: 'Open mic night at the clubhouse was magic 🎶 next one’s in two weeks, sign up!' },
  { img: '1550831107-1553da8c8464', cat: 'general', cap: 'Cozy knitting evening 🧶 making winter scarves — taking a couple of custom orders.' },
];

const GEN_AUTHORS = ['u_priya', 'u_arjun', 'u_fatima', 'u_ravi', 'u_sneha', 'u_karan', 'u_ananya', 'u_vikram', 'u_deepa', 'u_imran'];

// Synthetic reaction rows (padding) purely so counts vary; the mock only needs
// reactions.length for the count and whether ME_ID is present for "you reacted".
const genReactions = (postId: string, count: number, meReacts: boolean) => {
  const arr: { user_id: string; type: string }[] = [];
  for (let i = 0; i < count; i++) arr.push({ user_id: `${postId}_r${i}`, type: i % 4 === 0 ? 'love' : 'like' });
  if (meReacts) arr.push({ user_id: ME_ID, type: 'love' });
  return arr;
};

// author is intentionally omitted — the mock client resolves it from profiles
// at read time, so ME-authored posts pick up the name typed at login.
//
// Deterministic per-author generation (not a global i%N scatter) — every
// profile, including ME, needs its OWN grid to be worth opening, so each
// author here gets a guaranteed POSTS_PER_AUTHOR posts rather than "however
// many the modulo happens to land on."
const POST_AUTHORS = [...GEN_AUTHORS, ME_ID];
const POSTS_PER_AUTHOR = 10;

const generatedPosts: Record<string, any>[] = [];
let genCounter = 0;
for (const author_id of POST_AUTHORS) {
  for (let j = 0; j < POSTS_PER_AUTHOR; j++) {
    const a = ACTIVITIES[genCounter % ACTIVITIES.length];
    const id = `gp${genCounter + 1}`;
    generatedPosts.push({
      id,
      author_id,
      neighbourhood_id: NBHD_ID,
      category: a.cat,
      caption: a.cap,
      media_urls: [IMG(a.img)],
      image_urls: [IMG(a.img)],
      created_at: ago(45 + genCounter * 33),
      reactions: genReactions(id, 3 + ((genCounter * 7) % 44), genCounter % 6 === 0),
      comments: [] as { id: string }[],
    });
    genCounter++;
  }
}

// ---------------------------------------------------------------------------
// Selfies + friend photos — every named neighbour (not ME, whose real photo
// we don't know) gets 5 selfie-style posts (grabbing a bite / asking for a
// recommendation) and 2 "with friends" photos. Selfie faces are gender-
// matched to that profile's avatar; every image below is used in exactly one
// profile's slot, so no photo repeats across posts.
// ---------------------------------------------------------------------------
const SELFIE_CAPTIONS = [
  'Grabbing a quick vada pav before work 😋 anyone know a better stall nearby?',
  'Trying the new filter coffee spot down the road ☕ good, but open to better recommendations!',
  "Lunch break selfie 🍛 what's everyone's go-to comfort food around here?",
  'Snack attack while working from the balcony 🍪 recommend your favourite bakery!',
  'Grabbing chai before the evening walk ☕ know a better tea stall nearby?',
  'Weekend breakfast mood 🥞 where do you all go for a good breakfast around here?',
  'Midday munchies 🥪 any hidden-gem cafés I should try?',
  'Post-workout smoothie o’clock 🥤 suggest a good healthy spot nearby!',
  'Evening street-food run 🌽 any must-try stalls I’m missing?',
  'Ice cream break on a hot day 🍦 recommend your favourite flavour spot!',
];

const FRIEND_CAPTIONS = [
  'Catching up with the gang over coffee ☕ good times.',
  'Weekend hangout with these two 🤍 missed this.',
  'Sunday brunch with my favourite people 🥂',
  'Evening out with the crew, as always too many laughs 😂',
  'Best part of the week — time with these two 💛',
];

const RANDOMUSER = (gender: 'men' | 'women', n: number) => `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;

const FRIEND_PHOTOS = {
  f1: IMG('1529156069898-49953e39b3ac'), // group of friends, backs turned, viewpoint
  f2: IMG('1529333166437-7750a6dd5a70'), // three women, arms raised at sunset
  f3: IMG('1517457373958-b7bdd4587205'), // friends at an evening gathering
  f4: IMG('1528605248644-14dd04022da1'), // big group dinner around a table
  f5: IMG('1521737604893-d14cc237f11d'), // friends working/hanging out together
  f6: IMG('1523240795612-9a054b0db644'), // friends laughing together
  f7: IMG('1528605105345-5344ea20e269'), // group hangout, friend presenting
  f8: IMG('1573497491208-6b1acb260507'), // two friends chatting over a table
} as const;

const PROFILE_PHOTO_PLAN: Record<string, { gender: 'men' | 'women'; selfieNums: number[]; friends: [keyof typeof FRIEND_PHOTOS, keyof typeof FRIEND_PHOTOS] }> = {
  u_priya: { gender: 'women', selfieNums: [1, 2, 3, 4, 6], friends: ['f1', 'f2'] },
  u_fatima: { gender: 'women', selfieNums: [7, 8, 10, 11, 13], friends: ['f2', 'f4'] },
  u_sneha: { gender: 'women', selfieNums: [15, 16, 18, 19, 20], friends: ['f7', 'f8'] },
  u_ananya: { gender: 'women', selfieNums: [24, 26, 27, 28, 30], friends: ['f6', 'f8'] },
  u_deepa: { gender: 'women', selfieNums: [35, 36, 37, 39, 40], friends: ['f2', 'f6'] },
  u_arjun: { gender: 'men', selfieNums: [1, 2, 3, 4, 5], friends: ['f3', 'f4'] },
  u_ravi: { gender: 'men', selfieNums: [7, 8, 9, 10, 11], friends: ['f5', 'f6'] },
  u_karan: { gender: 'men', selfieNums: [13, 14, 15, 16, 17], friends: ['f1', 'f3'] },
  u_vikram: { gender: 'men', selfieNums: [19, 20, 21, 22, 24], friends: ['f5', 'f7'] },
  u_imran: { gender: 'men', selfieNums: [26, 27, 28, 29, 30], friends: ['f1', 'f5'] },
};

const profilePosts: Record<string, any>[] = [];
let ppCounter = 0;
Object.entries(PROFILE_PHOTO_PLAN).forEach(([authorId, plan], profileIndex) => {
  plan.selfieNums.forEach((n, i) => {
    const id = `sf${ppCounter + 1}`;
    const img = RANDOMUSER(plan.gender, n);
    profilePosts.push({
      id,
      author_id: authorId,
      neighbourhood_id: NBHD_ID,
      category: 'recommend',
      caption: SELFIE_CAPTIONS[(profileIndex + i) % SELFIE_CAPTIONS.length],
      media_urls: [img],
      image_urls: [img],
      created_at: ago(50 + ppCounter * 41),
      reactions: genReactions(id, 2 + ((ppCounter * 5) % 20), ppCounter % 5 === 0),
      comments: [] as { id: string }[],
    });
    ppCounter++;
  });

  plan.friends.forEach((key, i) => {
    const id = `sf${ppCounter + 1}`;
    const img = FRIEND_PHOTOS[key];
    profilePosts.push({
      id,
      author_id: authorId,
      neighbourhood_id: NBHD_ID,
      category: 'general',
      caption: FRIEND_CAPTIONS[(profileIndex + i) % FRIEND_CAPTIONS.length],
      media_urls: [img],
      image_urls: [img],
      created_at: ago(60 + ppCounter * 41),
      reactions: genReactions(id, 2 + ((ppCounter * 5) % 20), ppCounter % 5 === 0),
      comments: [] as { id: string }[],
    });
    ppCounter++;
  });
});

export const posts = [...basePosts, ...generatedPosts, ...profilePosts];

// Reactions live in their own table (mirrors the real schema) so that a
// reaction the user adds at runtime merges with the seeded ones — the mock
// client resolves post.reactions from here, not from the embedded arrays above.
export const reactions = posts.flatMap((p) =>
  (p.reactions ?? []).map((r, i) => ({
    id: `${p.id}_react_${i}`,
    post_id: p.id,
    user_id: r.user_id,
    type: r.type,
  }))
);

export const comments = [
  { id: 'c1', post_id: 'p1', author_id: 'u_arjun', text: 'Reserve one sourdough for me please!', created_at: ago(30), author: authorOf('u_arjun') },
  { id: 'c2', post_id: 'p1', author_id: 'u_fatima', text: 'Your banana bread is the best in HSR 😍', created_at: ago(25), author: authorOf('u_fatima') },
  { id: 'c3', post_id: 'p2', author_id: 'u_priya', text: 'Count me and my daughter in 🌱', created_at: ago(110), author: authorOf('u_priya') },
  { id: 'c4', post_id: 'p3', author_id: 'u_ravi', text: 'Try Suresh — 98xxxxxx21, very reliable.', created_at: ago(230), author: authorOf('u_ravi') },
  { id: 'c5', post_id: 'p3', author_id: 'u_fatima', text: 'Seconding Suresh, he fixed ours last month.', created_at: ago(220), author: authorOf('u_fatima') },
  { id: 'c6', post_id: 'p3', author_id: 'u_priya', text: 'Following, mine needs servicing too.', created_at: ago(210), author: authorOf('u_priya') },
  { id: 'c7', post_id: 'p4', author_id: 'u_priya', text: 'Would love a cutting! I’m in Sector 2.', created_at: ago(390), author: authorOf('u_priya') },
  { id: 'c8', post_id: 'p6', author_id: 'u_arjun', text: 'Went this morning, can confirm — brilliant.', created_at: ago(880), author: authorOf('u_arjun') },
  { id: 'c9', post_id: 'p6', author_id: 'u_ravi', text: 'Adding to my weekend list ☕', created_at: ago(870), author: authorOf('u_ravi') },
  { id: 'c10', post_id: 'p7', author_id: 'u_fatima', text: 'Thanks for the heads up, staying alert.', created_at: ago(1490), author: authorOf('u_fatima') },
];

// category values must be one of bazaarCategories: furniture | electronics |
// books | clothing | free. image_urls/media_urls are both present (different
// screens read different names) and updated_at drives the "still available?"
// staleness chip.
const listing = (o: Record<string, any>) => ({ image_urls: [], media_urls: [], status: 'active', updated_at: o.created_at, ...o });

export const listings = [
  listing({
    id: 'l1',
    seller_id: 'u_arjun',
    neighbourhood_id: NBHD_ID,
    title: 'Sony noise-cancelling headphones',
    description: 'WH-1000XM4, barely used, boxed with all accessories. Selling as I upgraded.',
    price: 9500,
    category: 'electronics',
    condition: 'Like New',
    created_at: ago(180),
    seller: authorOf('u_arjun'),
  }),
  listing({
    id: 'l2',
    seller_id: 'u_fatima',
    neighbourhood_id: NBHD_ID,
    title: 'Solid wood bookshelf',
    description: 'Sturdy 5-shelf bookshelf, teak finish. Great condition. Pickup from Sector 7.',
    price: 3200,
    category: 'furniture',
    condition: 'Used',
    created_at: ago(500),
    seller: authorOf('u_fatima'),
  }),
  listing({
    id: 'l3',
    seller_id: 'u_priya',
    neighbourhood_id: NBHD_ID,
    title: 'Baking cookbook bundle (5 books)',
    description: 'Five well-loved baking books incl. Tartine Bread. Perfect for a beginner baker.',
    price: 800,
    category: 'books',
    condition: 'Used',
    created_at: ago(1100),
    seller: authorOf('u_priya'),
  }),
  listing({
    id: 'l4',
    seller_id: 'u_ravi',
    neighbourhood_id: NBHD_ID,
    title: 'Kids’ cycle (age 5–8)',
    description: 'Free to a good home — my son outgrew it. Works fine, needs a little cleaning.',
    price: null,
    category: 'free',
    condition: 'Used',
    created_at: ago(2600),
    seller: authorOf('u_ravi'),
  }),
  listing({
    id: 'l5',
    seller_id: 'u_arjun',
    neighbourhood_id: NBHD_ID,
    title: 'Winter jackets (M/L)',
    description: 'Two lightly-used jackets, one North Face. Great for Bangalore December mornings.',
    price: 1500,
    category: 'clothing',
    condition: 'Like New',
    created_at: ago(4000),
    seller: authorOf('u_arjun'),
  }),
];

// event_type / privacy_tier / guest_limit / status:'active' match what
// ScenesScreen and EventDetail query for. starts_at is in the future
// (negative "mins ago") so events land in the upcoming tab.
const event = (o: Record<string, any>) => ({
  privacy_tier: 'open',
  guest_limit: null,
  cover_url: null,
  status: 'active',
  ...o,
});

export const events = [
  event({
    id: 'e1',
    host_id: 'u_ravi',
    neighbourhood_id: NBHD_ID,
    title: 'Sunday Tree-Planting Drive',
    description: 'Join us to plant 40 saplings at the HSR BDA park. Gloves and water provided for the first 20.',
    location: 'HSR BDA Park, Sector 3',
    starts_at: ago(-60 * 24 * 2),
    event_type: 'Community',
    created_at: ago(300),
    host: authorOf('u_ravi'),
  }),
  event({
    id: 'e2',
    host_id: 'u_priya',
    neighbourhood_id: NBHD_ID,
    title: 'Home Bakers’ Meetup',
    description: 'Bring a bake to share and swap recipes. Casual evening at the HSR club lawn.',
    location: 'HSR Club Lawn',
    starts_at: ago(-60 * 24 * 5),
    event_type: 'Food',
    created_at: ago(700),
    host: authorOf('u_priya'),
  }),
  event({
    id: 'e3',
    host_id: 'u_arjun',
    neighbourhood_id: NBHD_ID,
    title: 'Weekend Cycling Group Ride',
    description: '20 km easy ride around HSR and Agara Lake. All levels welcome, helmets mandatory.',
    location: 'Meet at 27th Main signal',
    starts_at: ago(-60 * 24 * 1),
    event_type: 'Sports',
    created_at: ago(900),
    host: authorOf('u_arjun'),
  }),
];

// A few going RSVPs so Scenes shows live guest counts and EventDetail has a
// guest list; the current user can add/'change their own on top.
export const event_rsvps = [
  { id: 'rsvp1', event_id: 'e1', user_id: 'u_priya', status: 'going' },
  { id: 'rsvp2', event_id: 'e1', user_id: 'u_fatima', status: 'going' },
  { id: 'rsvp3', event_id: 'e1', user_id: 'u_arjun', status: 'going' },
  { id: 'rsvp4', event_id: 'e2', user_id: 'u_ravi', status: 'going' },
  { id: 'rsvp5', event_id: 'e2', user_id: 'u_fatima', status: 'going' },
  { id: 'rsvp6', event_id: 'e3', user_id: 'u_priya', status: 'going' },
];

// page_type / bio / ngo_approval_status match what MyPagesScreen and
// PageDetailScreen query for (the old type/description/verified shape crashed
// the card renderer because page_type was undefined).
export const pages = [
  {
    id: 'pg1',
    owner_id: 'u_ravi',
    neighbourhood_id: NBHD_ID,
    page_type: 'ngo',
    name: 'Green HSR Foundation',
    bio: 'Community-run NGO greening HSR Layout one park at a time. Donations fund saplings and upkeep.',
    ngo_approval_status: 'approved',
    darpan_id: 'KA/2019/0234567',
    address: 'Sector 3, HSR Layout',
    geocode_status: 'verified',
    profession: null,
    gst_number: null,
    avatar_url: null,
    created_at: ago(5000),
    owner: authorOf('u_ravi'),
  },
  {
    id: 'pg2',
    owner_id: 'u_priya',
    neighbourhood_id: NBHD_ID,
    page_type: 'business',
    name: 'Priya’s Home Bakes',
    bio: 'Small-batch sourdough, banana bread, and celebration cakes. Order a day in advance.',
    ngo_approval_status: 'not_applicable',
    gst_number: '29ABCDE1234F1Z5',
    address: 'Sector 2, HSR Layout',
    geocode_status: 'verified',
    profession: null,
    darpan_id: null,
    avatar_url: null,
    created_at: ago(3000),
    owner: authorOf('u_priya'),
  },
];

export const society_memberships = [
  {
    id: 'm1',
    user_id: ME_ID,
    neighbourhood_id: NBHD_ID,
    society: 'Green Meadows',
    tower: 'A',
    flat: '101',
    verification_status: 'verified',
    lat: 12.9121,
    lng: 77.6446,
    verified_at: ago(60 * 24 * 30),
    created_at: ago(60 * 24 * 30),
    neighbourhood: { id: NBHD_ID, name: 'HSR Layout', city: 'Bengaluru' },
  },
];

// People shown in Explore's two tiers (returned by the discover_* RPCs).
export const discover_nearby = [
  { user_id: 'u_priya', name: 'Priya Sharma', tower: '2', distance_km: 0.3 },
  { user_id: 'u_arjun', name: 'Arjun Menon', tower: 'B', distance_km: 0.6 },
  { user_id: 'u_fatima', name: 'Fatima Khan', tower: '7', distance_km: 0.9 },
  { user_id: 'u_ravi', name: 'Ravi Kulkarni', tower: '1', distance_km: 1.2 },
].map((p) => ({ ...p, avatar_url: profiles.find((x) => x.id === p.user_id)?.avatar_url ?? null }));

export const discover_city = [
  { user_id: 'u_city1', name: 'Sneha Iyer', neighbourhood_name: 'Koramangala', shared_vibes_count: 3, avatar_url: 'https://randomuser.me/api/portraits/women/58.jpg' },
  { user_id: 'u_city2', name: 'Karthik Rao', neighbourhood_name: 'Indiranagar', shared_vibes_count: 2, avatar_url: 'https://randomuser.me/api/portraits/men/23.jpg' },
  { user_id: 'u_city3', name: 'Ananya Das', neighbourhood_name: 'Koramangala', shared_vibes_count: 1, avatar_url: 'https://randomuser.me/api/portraits/women/81.jpg' },
];

// Chat uses the chats / chat_members / messages schema. Members embed a `user`
// object the way the nested `chat_members(user:profiles(...))` select expects;
// message authors are resolved from profiles by the mock client.
const member = (id: string) => ({
  user_id: id,
  user: { name: profiles.find((p) => p.id === id)?.name ?? null, avatar_url: profiles.find((p) => p.id === id)?.avatar_url ?? null },
});

export const chats = [
  { id: 'chat1', is_group: false, name: null as string | null, emoji: null as string | null, chat_members: [member(ME_ID), member('u_priya')] },
  { id: 'chat2', is_group: false, name: null as string | null, emoji: null as string | null, chat_members: [member(ME_ID), member('u_arjun')] },
  { id: 'chat3', is_group: true, name: 'HSR Runners', emoji: '🏃', chat_members: [member(ME_ID), member('u_arjun'), member('u_ravi')] },
];

// Kept for any legacy reference; the live chat screens read `chats` above.
export const conversations = chats;

export const messages = [
  { id: 'msg1', chat_id: 'chat1', author_id: 'u_priya', kind: 'text', text: 'Hi! Saw you liked my post 🙂', media_url: null, media_duration_ms: null, created_at: ago(40) },
  { id: 'msg2', chat_id: 'chat1', author_id: ME_ID, kind: 'text', text: 'Yes! Can I get one sourdough for the weekend?', media_url: null, media_duration_ms: null, created_at: ago(30) },
  { id: 'msg3', chat_id: 'chat1', author_id: 'u_priya', kind: 'text', text: 'Sure, I’ll reserve a sourdough for you!', media_url: null, media_duration_ms: null, created_at: ago(20) },
  { id: 'msg4', chat_id: 'chat2', author_id: 'u_arjun', kind: 'text', text: 'The ride starts at 6:30, see you there 🚴', media_url: null, media_duration_ms: null, created_at: ago(300) },
  { id: 'msg5', chat_id: 'chat3', author_id: 'u_ravi', kind: 'text', text: 'Great run today everyone! Same time next week?', media_url: null, media_duration_ms: null, created_at: ago(180) },
];

// type/title/related_id match NotificationsScreen (title was missing before, so
// every row rendered with a blank heading). circle_connection + related_id
// lights up the "+ Circle back" button.
export const notifications = [
  { id: 'n1', user_id: ME_ID, type: 'points_awarded', title: 'You earned 10 points', body: 'Priya Sharma loved your post', related_id: null as string | null, read: false, created_at: ago(15) },
  { id: 'n2', user_id: ME_ID, type: 'event_reminder', title: 'New comment', body: 'Arjun Menon commented on the tree-planting drive', related_id: null as string | null, read: false, created_at: ago(90) },
  { id: 'n3', user_id: ME_ID, type: 'circle_connection', title: 'New connection', body: 'Fatima Khan added you to their circle', related_id: 'u_fatima', read: true, created_at: ago(1200) },
];

// Stories — image-backed, one per neighbour, newest first. media_url points at
// the same studio Unsplash set; the mock client resolves `author` from profiles.
export const stories = [
  { id: 'st1', author_id: 'u_priya', media_url: IMG('1509440159596-0249088772ff'), caption: 'Fresh bakes ☀️', created_at: ago(20) },
  { id: 'st2', author_id: 'u_arjun', media_url: IMG('1541625602330-2277a4c46182'), caption: 'Morning ride 🚴', created_at: ago(55) },
  { id: 'st3', author_id: 'u_ananya', media_url: IMG('1565193566173-7a0ee3dbe261'), caption: 'Studio day 🏺', created_at: ago(90) },
  { id: 'st4', author_id: 'u_ravi', media_url: IMG('1416879595882-3373a0480b5b'), caption: 'In the garden 🌱', created_at: ago(120) },
  { id: 'st5', author_id: 'u_sneha', media_url: IMG('1544367567-0f2fcb009e0b'), caption: 'Rooftop yoga 🧘', created_at: ago(150) },
  { id: 'st6', author_id: 'u_imran', media_url: IMG('1511671782779-c97d3d27a1d4'), caption: 'Jam session 🎸', created_at: ago(200) },
  { id: 'st7', author_id: 'u_deepa', media_url: IMG('1488459716781-31db52582fe9'), caption: 'Market haul 🥬', created_at: ago(240) },
];

export const safety_alerts = [
  { id: 'sa1', neighbourhood_id: NBHD_ID, title: 'Bike thefts near Sector 6', body: 'A few bike thefts reported this week. Double-lock your vehicles.', severity: 'warning', created_at: ago(1500) },
  { id: 'sa2', neighbourhood_id: NBHD_ID, title: 'Water supply disruption', body: 'BWSSB maintenance on Sunday 6–10 AM. Store water in advance.', severity: 'info', created_at: ago(3000) },
];
