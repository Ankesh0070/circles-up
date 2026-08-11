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
    avatar_url: null,
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
    avatar_url: null,
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
    avatar_url: null,
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
    avatar_url: null,
    vibes: ['Volunteer', 'Runner', 'Gardener'],
    active_neighbourhood_id: NBHD_ID,
    onboarding_completed: true,
    points: 520,
    created_at: ago(60 * 24 * 400),
    neighbourhood: { id: NBHD_ID, name: 'HSR Layout', city: 'Bengaluru' },
  },
];

const authorOf = (id: string) => {
  const p = profiles.find((x) => x.id === id)!;
  return { name: p.name, avatar_url: p.avatar_url, created_at: p.created_at };
};

export const posts = [
  {
    id: 'p1',
    author_id: 'u_priya',
    neighbourhood_id: NBHD_ID,
    category: 'Recommendations',
    caption:
      'Fresh sourdough and banana bread coming out of my oven this weekend! DM me to reserve a loaf 🍞 Sector 2 pickup.',
    media_urls: [],
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
    media_urls: [],
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
    media_urls: [],
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
    media_urls: [],
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
    media_urls: [],
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
    media_urls: [],
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
    media_urls: [],
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
    media_urls: [],
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

export const events = [
  {
    id: 'e1',
    host_id: 'u_ravi',
    neighbourhood_id: NBHD_ID,
    title: 'Sunday Tree-Planting Drive',
    description: 'Join us to plant 40 saplings at the HSR BDA park. Gloves and water provided for the first 20.',
    location: 'HSR BDA Park, Sector 3',
    starts_at: ago(-60 * 24 * 2),
    category: 'Community',
    cover_url: null,
    status: 'upcoming',
    created_at: ago(300),
    host: authorOf('u_ravi'),
    attendee_count: 18,
  },
  {
    id: 'e2',
    host_id: 'u_priya',
    neighbourhood_id: NBHD_ID,
    title: 'Home Bakers’ Meetup',
    description: 'Bring a bake to share and swap recipes. Casual evening at the HSR club lawn.',
    location: 'HSR Club Lawn',
    starts_at: ago(-60 * 24 * 5),
    category: 'Food',
    cover_url: null,
    status: 'upcoming',
    created_at: ago(700),
    host: authorOf('u_priya'),
    attendee_count: 9,
  },
  {
    id: 'e3',
    host_id: 'u_arjun',
    neighbourhood_id: NBHD_ID,
    title: 'Weekend Cycling Group Ride',
    description: '20 km easy ride around HSR and Agara Lake. All levels welcome, helmets mandatory.',
    location: 'Meet at 27th Main signal',
    starts_at: ago(-60 * 24 * 1),
    category: 'Sports',
    cover_url: null,
    status: 'upcoming',
    created_at: ago(900),
    host: authorOf('u_arjun'),
    attendee_count: 12,
  },
];

export const pages = [
  {
    id: 'pg1',
    owner_id: 'u_ravi',
    neighbourhood_id: NBHD_ID,
    type: 'ngo',
    name: 'Green HSR Foundation',
    description: 'Community-run NGO greening HSR Layout one park at a time. Donations fund saplings and upkeep.',
    category: 'Environment',
    avatar_url: null,
    verified: true,
    donation_enabled: true,
    created_at: ago(5000),
    owner: authorOf('u_ravi'),
  },
  {
    id: 'pg2',
    owner_id: 'u_priya',
    neighbourhood_id: NBHD_ID,
    type: 'business',
    name: 'Priya’s Home Bakes',
    description: 'Small-batch sourdough, banana bread, and celebration cakes. Order a day in advance.',
    category: 'Food & Beverage',
    avatar_url: null,
    verified: false,
    donation_enabled: false,
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
];

export const discover_city = [
  { user_id: 'u_city1', name: 'Sneha Iyer', neighbourhood_name: 'Koramangala', shared_vibes_count: 3 },
  { user_id: 'u_city2', name: 'Karthik Rao', neighbourhood_name: 'Indiranagar', shared_vibes_count: 2 },
  { user_id: 'u_city3', name: 'Ananya Das', neighbourhood_name: 'Koramangala', shared_vibes_count: 1 },
];

export const conversations = [
  {
    id: 'conv1',
    other: { id: 'u_priya', name: 'Priya Sharma', avatar_url: null },
    last_message: 'Sure, I’ll reserve a sourdough for you!',
    last_message_at: ago(20),
    unread: 1,
  },
  {
    id: 'conv2',
    other: { id: 'u_arjun', name: 'Arjun Menon', avatar_url: null },
    last_message: 'The ride starts at 6:30, see you there 🚴',
    last_message_at: ago(300),
    unread: 0,
  },
];

export const messages = [
  { id: 'msg1', conversation_id: 'conv1', sender_id: 'u_priya', text: 'Hi! Saw you liked my post 🙂', created_at: ago(40) },
  { id: 'msg2', conversation_id: 'conv1', sender_id: ME_ID, text: 'Yes! Can I get one sourdough for the weekend?', created_at: ago(30) },
  { id: 'msg3', conversation_id: 'conv1', sender_id: 'u_priya', text: 'Sure, I’ll reserve a sourdough for you!', created_at: ago(20) },
];

export const notifications = [
  { id: 'n1', user_id: ME_ID, type: 'reaction', body: 'Priya Sharma loved your post', read: false, created_at: ago(15) },
  { id: 'n2', user_id: ME_ID, type: 'comment', body: 'Arjun Menon commented on the tree-planting drive', read: false, created_at: ago(90) },
  { id: 'n3', user_id: ME_ID, type: 'connection', body: 'Fatima Khan connected with you', read: true, created_at: ago(1200) },
];

export const safety_alerts = [
  { id: 'sa1', neighbourhood_id: NBHD_ID, title: 'Bike thefts near Sector 6', body: 'A few bike thefts reported this week. Double-lock your vehicles.', severity: 'warning', created_at: ago(1500) },
  { id: 'sa2', neighbourhood_id: NBHD_ID, title: 'Water supply disruption', body: 'BWSSB maintenance on Sunday 6–10 AM. Store water in advance.', severity: 'info', created_at: ago(3000) },
];
