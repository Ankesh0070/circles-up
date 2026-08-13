// A drop-in stand-in for the Supabase client, backed entirely by local seed
// data (see seed.ts). Every screen imports `supabase` from
// shared/api/supabase.ts; that file now re-exports this, so no screen code has
// to change. Reads return seed rows; writes mutate in-memory arrays (lost on
// refresh, which is fine for a demo); auth is fake and stored in
// localStorage; rpc/storage/realtime are safe no-ops.

import * as seed from './seed';

type Row = Record<string, any>;

// -------------------------------------------------------------- fake auth --
const AUTH_KEY = 'mock_user';
// Everything a signed-in person creates or changes (posts, profile edits,
// RSVPs, listings, ...) — separate from AUTH_KEY, which is just "who's
// signed in." See loadPersisted()/persist() near the table store below.
//
// Bump the version suffix whenever a seed.ts CONTENT fix (not a schema/shape
// change) needs to reach browsers that already have an old snapshot saved —
// a stale snapshot always wins over fresh seed defaults by design (that's
// the whole point of persisting), so without this, someone who visited
// before a seed fix landed would keep seeing the old data forever.
const PERSIST_KEY = 'mock_db_v4';

export interface MockUser {
  id: string;
  email: string;
  name: string;
}

type AuthListener = (event: string, session: { user: MockUser } | null) => void;
const authListeners = new Set<AuthListener>();

function readUser(): MockUser | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeUser(user: MockUser | null) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}

function sessionOf(user: MockUser | null) {
  return user ? { user, access_token: 'mock-token', expires_at: Math.floor(Date.now() / 1000) + 3600 } : null;
}

// Patch the seed "me" profile from the stored user so the typed name shows up
// everywhere — on login AND after a refresh (module reloads reset the seed to
// its default "You", so this has to re-run whenever the session is read).
function syncMeProfile() {
  const u = readUser();
  if (!u) return;
  const me = seed.profiles.find((p) => p.id === seed.ME_ID);
  if (me) {
    me.name = u.name;
    me.username = (u.name || 'you').toLowerCase().replace(/\s+/g, '') || 'you';
  }
}

function notifyAuth(event: string) {
  const session = sessionOf(readUser());
  authListeners.forEach((fn) => fn(event, session));
}

// Public helper the login/signup screens call to "sign in" with a typed name.
export function mockSignIn(name: string, email?: string): MockUser {
  const user: MockUser = {
    id: seed.ME_ID,
    email: email?.trim() || `${(name || 'you').trim().toLowerCase().replace(/\s+/g, '.')}@demo.circleup`,
    name: (name || 'You').trim() || 'You',
  };
  writeUser(user);
  syncMeProfile();
  notifyAuth('SIGNED_IN');
  return user;
}

// Signup screens call this instead of mockSignIn — a returning user
// (mockSignIn) keeps whatever onboarding state the demo profile already has,
// but a brand-new account has to actually walk the Address -> ProfileSetup
// gauntlet the way it was designed to. Resets onboarding_completed to false
// and wipes the previous demo session's profile/membership data so that
// gauntlet has something real to fill in rather than resuming an
// already-"onboarded" seed profile.
export function mockSignUp(name: string, email?: string): MockUser {
  const user = mockSignIn(name, email);
  const me = seed.profiles.find((p) => p.id === seed.ME_ID);
  if (me) {
    me.onboarding_completed = false;
    me.bio = null;
    me.vibes = [];
    me.avatar_url = null;
    me.active_neighbourhood_id = null;
    me.neighbourhood = null;
  }
  for (let i = seed.society_memberships.length - 1; i >= 0; i--) {
    if (seed.society_memberships[i].user_id === seed.ME_ID) seed.society_memberships.splice(i, 1);
  }
  persist();
  return user;
}

export function mockCurrentUser(): MockUser | null {
  return readUser();
}

const auth = {
  async getSession() {
    syncMeProfile();
    return { data: { session: sessionOf(readUser()) }, error: null };
  },
  async getUser() {
    syncMeProfile();
    const user = readUser();
    return { data: { user }, error: null as any };
  },
  onAuthStateChange(cb: AuthListener) {
    authListeners.add(cb);
    // Fire once asynchronously with the current state, mirroring supabase-js.
    setTimeout(() => cb('INITIAL_SESSION', sessionOf(readUser())), 0);
    return {
      data: {
        subscription: {
          unsubscribe() {
            authListeners.delete(cb);
          },
        },
      },
    };
  },
  async signInWithPassword({ email }: { email?: string; phone?: string; password: string }) {
    const existing = readUser();
    const user = existing ?? mockSignIn(email?.split('@')[0] ?? 'You', email);
    if (existing) notifyAuth('SIGNED_IN');
    return { data: { user, session: sessionOf(user) }, error: null as any };
  },
  async signUp({ email }: { email?: string; phone?: string; password: string }) {
    const user = mockSignUp(email?.split('@')[0] ?? 'You', email);
    return { data: { user, session: sessionOf(user) }, error: null as any };
  },
  async signInWithOtp() {
    return { data: {}, error: null as any };
  },
  async verifyOtp() {
    // edgecase.md §1.10 — verifying a number that's already fully onboarded
    // signs into that existing account rather than silently creating a
    // second identity; anything else (never onboarded, or mid-gauntlet) is a
    // fresh signup and gets routed through Address -> ProfileSetup.
    const alreadyOnboarded = seed.profiles.find((p) => p.id === seed.ME_ID)?.onboarding_completed;
    const user = alreadyOnboarded ? mockSignIn('You') : mockSignUp('New Neighbour');
    return { data: { user, session: sessionOf(user) }, error: null as any };
  },
  async signInWithOAuth() {
    return { data: { url: null, provider: 'google' }, error: { message: 'OAuth not available in demo' } as any };
  },
  async signOut() {
    writeUser(null);
    notifyAuth('SIGNED_OUT');
    return { error: null as any };
  },
  async updateUser() {
    return { data: { user: readUser() }, error: null as any };
  },
  async resend() {
    return { data: {}, error: null as any };
  },
  async refreshSession() {
    // ProfileSetupScreen calls this right after flipping
    // profiles.onboarding_completed to true, to force RootNavigator's
    // session listener to re-fire — a plain state update on this end can't
    // reach a component tree whose top-level route is about to swap out from
    // under it (Address/ProfileSetup -> Main).
    notifyAuth('TOKEN_REFRESHED');
    return { data: { session: sessionOf(readUser()) }, error: null as any };
  },
};

// ------------------------------------------------------------ table store --
// Maps a table name to its backing array. Unknown tables resolve to [] so
// screens hit a graceful empty state rather than an error.
const tables: Record<string, Row[]> = {
  profiles: seed.profiles,
  posts: seed.posts,
  comments: seed.comments,
  listings: seed.listings,
  bazaar_listings: seed.listings,
  events: seed.events,
  scenes: seed.events,
  pages: seed.pages,
  neighbourhoods: seed.neighbourhoods,
  society_memberships: seed.society_memberships,
  chats: seed.chats,
  chat_members: [],
  conversations: seed.conversations,
  messages: seed.messages,
  notifications: seed.notifications,
  safety_alerts: seed.safety_alerts,
  reactions: seed.reactions,
  // Write-heavy / relationship tables that screens read but we keep empty:
  hidden_posts: [],
  muted_users: [],
  blocked_users: [],
  circle_connections: [],
  comment_likes: [],
  saved_posts: [],
  trusted_contacts: [],
  event_rsvps: seed.event_rsvps,
  event_attendees: [],
  page_followers: [],
  donations: [],
  ads: [],
  stories: seed.stories,
  story_views: [],
  reports: [],
};

// Natural-key conflict targets for upsert/insert on join tables that have no
// client-supplied id — matches the real schema's unique constraints so a
// second like/save/RSVP updates the existing row instead of piling up.
const CONFLICT_KEYS: Record<string, string[]> = {
  reactions: ['post_id', 'user_id'],
  comment_likes: ['comment_id', 'user_id'],
  saved_posts: ['user_id', 'post_id'],
  event_rsvps: ['event_id', 'user_id'],
  event_attendees: ['event_id', 'user_id'],
  page_followers: ['page_id', 'user_id'],
  circle_connections: ['user_id', 'connected_user_id'],
  dm_blocks: ['blocker_id', 'blocked_id'],
  hidden_posts: ['user_id', 'post_id'],
  muted_users: ['user_id', 'muted_user_id'],
};

// Columns the real Postgres schema fills via DEFAULT (0, false, …) that a
// screen never sets explicitly on insert — e.g. ad_campaigns.budget_spent
// only ever gets written by a server-side spend tracker, never the create
// form. Without this, a freshly-inserted row is missing the field entirely
// (undefined, not 0), and any screen doing arithmetic or `.toFixed()` on it
// crashes the whole app. Applied as fallbacks so an explicit payload value
// always wins.
const INSERT_DEFAULTS: Record<string, Row> = {
  ad_campaigns: { budget_spent: 0, impressions: 0, clicks: 0 },
};

// A trimmed profile the way the nested `author:profiles(...)` selects expect it.
function profileLite(id: string) {
  const p = (tables.profiles as Row[]).find((x) => x.id === id);
  return p ? { name: p.name, avatar_url: p.avatar_url ?? null, created_at: p.created_at } : null;
}

// Resolve the relationship fields screens read via join syntax (`author:...`,
// `reactions(...)`, `comments(...)`). The real backend does these joins; here we
// compute them from the backing tables so rows inserted at runtime (a new post,
// a fresh reaction) join up exactly like the seeded ones do.
function withRelations(table: string, rows: Row[]): Row[] {
  switch (table) {
    case 'posts':
      return rows.map((r) => ({
        ...r,
        author: r.author ?? profileLite(r.author_id),
        reactions: (tables.reactions as Row[]).filter((x) => x.post_id === r.id),
        comments: (tables.comments as Row[]).filter((c) => c.post_id === r.id).map((c) => ({ id: c.id })),
      }));
    case 'comments':
      return rows.map((r) => ({
        ...r,
        author: r.author ?? profileLite(r.author_id),
        comment_likes: (tables.comment_likes as Row[]).filter((x) => x.comment_id === r.id),
      }));
    case 'listings':
    case 'bazaar_listings':
      return rows.map((r) => ({ ...r, seller: r.seller ?? profileLite(r.seller_id) }));
    case 'events':
    case 'scenes':
      return rows.map((r) => ({
        ...r,
        host: r.host ?? profileLite(r.host_id),
        event_rsvps: (tables.event_rsvps as Row[]).filter((x) => x.event_id === r.id),
      }));
    case 'event_rsvps':
      return rows.map((r) => ({
        ...r,
        guest: r.guest ?? profileLite(r.user_id),
        event: r.event ?? (tables.events as Row[]).find((e) => e.id === r.event_id) ?? null,
      }));
    case 'pages':
      return rows.map((r) => ({ ...r, owner: r.owner ?? profileLite(r.owner_id) }));
    case 'messages':
    case 'stories':
      return rows.map((r) => ({ ...r, author: r.author ?? profileLite(r.author_id) }));
    case 'saved_posts':
      return rows.map((r) => ({ ...r, post: r.post ?? (tables.posts as Row[]).find((p) => p.id === r.post_id) ?? null }));
    case 'circle_connections':
      return rows.map((r) => ({ ...r, connected: r.connected ?? profileLite(r.connected_user_id) }));
    case 'dm_blocks':
      return rows.map((r) => ({ ...r, blocked: r.blocked ?? profileLite(r.blocked_id) }));
    default:
      return rows;
  }
}

function tableFor(name: string): Row[] {
  if (!(name in tables)) tables[name] = [];
  return tables[name];
}

// -------------------------------------------------------------- persistence --
// Mirrors the whole table store into localStorage after every mutation, and
// restores it — in place, so every file's direct `seed.X` array reference
// stays the SAME object, just with different contents — the moment this
// module loads. This is what makes a new post, an edited profile, an RSVP,
// etc. survive a page reload instead of resetting to the seed defaults every
// time. Auth (who's signed in) stays a separate concern tracked by AUTH_KEY;
// this key is purely "what has that account created or changed."
function persist() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PERSIST_KEY, JSON.stringify(tables));
  } catch {
    // Storage full/unavailable (e.g. private browsing) — this session just
    // stays in-memory-only rather than crashing on every write.
  }
}

function loadPersisted() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PERSIST_KEY) : null;
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const name of Object.keys(saved)) {
      const rows = saved[name];
      if (!Array.isArray(rows)) continue;
      const arr = tableFor(name);
      arr.length = 0;
      arr.push(...rows);
    }
  } catch {
    // Corrupt or outdated snapshot (e.g. from a previous build's shape) —
    // fall back to the fresh seed defaults rather than getting stuck.
  }
}

loadPersisted();
syncMeProfile();

function uuid() {
  return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// --------------------------------------------------------- query builder ---
// A thenable, chainable builder. Filters are applied best-effort; anything it
// doesn't understand is ignored rather than throwing. Terminal ops
// (insert/update/delete/upsert) mutate the backing array.
class QueryBuilder<T = any> implements PromiseLike<{ data: any; error: any }> {
  private table: string;
  private filters: { op: string; field: string; value: any }[] = [];
  private orderField: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: any = null;
  private singleMode: 'none' | 'single' | 'maybe' = 'none';

  constructor(table: string) {
    this.table = table;
  }

  select(_cols?: string) {
    if (this.mode !== 'insert' && this.mode !== 'update' && this.mode !== 'upsert') this.mode = 'select';
    return this;
  }
  insert(payload: any) {
    this.mode = 'insert';
    this.payload = payload;
    return this;
  }
  update(payload: any) {
    this.mode = 'update';
    this.payload = payload;
    return this;
  }
  upsert(payload: any) {
    this.mode = 'upsert';
    this.payload = payload;
    return this;
  }
  delete() {
    this.mode = 'delete';
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ op: 'eq', field, value });
    return this;
  }
  neq(field: string, value: any) {
    this.filters.push({ op: 'neq', field, value });
    return this;
  }
  in(field: string, value: any[]) {
    this.filters.push({ op: 'in', field, value });
    return this;
  }
  is(field: string, value: any) {
    this.filters.push({ op: 'is', field, value });
    return this;
  }
  gt(field: string, value: any) { this.filters.push({ op: 'gt', field, value }); return this; }
  gte(field: string, value: any) { this.filters.push({ op: 'gte', field, value }); return this; }
  lt(field: string, value: any) { this.filters.push({ op: 'lt', field, value }); return this; }
  lte(field: string, value: any) { this.filters.push({ op: 'lte', field, value }); return this; }
  ilike(field: string, value: string) {
    this.filters.push({ op: 'ilike', field, value });
    return this;
  }
  like(field: string, value: string) {
    this.filters.push({ op: 'ilike', field, value });
    return this;
  }
  contains(field: string, value: any) { this.filters.push({ op: 'contains', field, value }); return this; }
  or() { return this; }
  filter() { return this; }
  match(obj: Record<string, any>) {
    Object.entries(obj).forEach(([field, value]) => this.filters.push({ op: 'eq', field, value }));
    return this;
  }
  order(field: string, opts?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  range() { return this; }
  single() {
    this.singleMode = 'single';
    return this;
  }
  maybeSingle() {
    this.singleMode = 'maybe';
    return this;
  }

  private applyFilters(rows: Row[]): Row[] {
    return rows.filter((row) =>
      this.filters.every(({ op, field, value }) => {
        // If the row simply doesn't have the field, don't let the filter
        // exclude it — the seed often omits scoping columns we don't model.
        if (!(field in row)) return true;
        const rv = row[field];
        switch (op) {
          case 'eq': return rv === value;
          case 'neq': return rv !== value;
          case 'in': return Array.isArray(value) && value.includes(rv);
          case 'is': return rv === value || (value === null && (rv === null || rv === undefined));
          case 'gt': return rv > value;
          case 'gte': return rv >= value;
          case 'lt': return rv < value;
          case 'lte': return rv <= value;
          case 'ilike': return String(rv ?? '').toLowerCase().includes(String(value).replace(/%/g, '').toLowerCase());
          case 'contains': return Array.isArray(rv) && (Array.isArray(value) ? value.every((v) => rv.includes(v)) : rv.includes(value));
          default: return true;
        }
      })
    );
  }

  private run(): { data: any; error: any } {
    const store = tableFor(this.table);

    if (this.mode === 'insert' || this.mode === 'upsert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const conflictKeys = CONFLICT_KEYS[this.table];
      const defaults = INSERT_DEFAULTS[this.table];
      const inserted = items.map((it) => ({
        id: it.id ?? uuid(),
        created_at: new Date().toISOString(),
        ...defaults,
        ...it,
      }));
      inserted.forEach((row) => {
        // Match an existing row by natural key (join tables) or by id, so an
        // upsert updates in place instead of duplicating.
        const idx = conflictKeys
          ? store.findIndex((r) => conflictKeys.every((k) => r[k] === row[k]))
          : store.findIndex((r) => r.id === row.id);
        if (idx >= 0) store[idx] = { ...store[idx], ...row };
        else store.unshift(row);
      });
      inserted.forEach((row) => emitRealtime(this.table, 'INSERT', row));
      persist();
      const data = this.singleMode !== 'none' ? inserted[0] ?? null : inserted;
      return { data, error: null };
    }

    if (this.mode === 'update') {
      const matched = this.applyFilters(store);
      matched.forEach((row) => Object.assign(row, this.payload));
      // Keep the locally-stored auth identity's name in sync with the
      // profile's name. Without this, syncMeProfile() — called on every
      // getUser()/getSession() — patches the profile's name back to the
      // stale signup-time name (e.g. the email-derived placeholder) on the
      // very next auth check, silently discarding whatever ProfileSetup or
      // Edit Profile just saved.
      if (this.table === 'profiles' && 'name' in this.payload) {
        const current = readUser();
        const updatedMe = current && matched.find((r) => r.id === current.id);
        if (updatedMe) writeUser({ ...current, name: updatedMe.name });
      }
      persist();
      const data = this.singleMode !== 'none' ? matched[0] ?? null : matched;
      return { data, error: null };
    }

    if (this.mode === 'delete') {
      const matched = this.applyFilters(store);
      matched.forEach((row) => {
        const idx = store.indexOf(row);
        if (idx >= 0) store.splice(idx, 1);
      });
      persist();
      return { data: matched, error: null };
    }

    // select
    let rows = this.applyFilters(store);
    if (this.orderField) {
      const f = this.orderField;
      rows = [...rows].sort((a, b) => {
        const av = a[f];
        const bv = b[f];
        if (av === bv) return 0;
        const cmp = av > bv ? 1 : -1;
        return this.orderAsc ? cmp : -cmp;
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);

    // Resolve join-style relationship fields (author, reactions, comments, …).
    rows = withRelations(this.table, rows);

    if (this.singleMode === 'single') {
      return rows.length ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'No rows' } };
    }
    if (this.singleMode === 'maybe') {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

// ---------------------------------------------------------------- storage --
const storage = {
  from(_bucket: string) {
    return {
      async upload(path: string) {
        return { data: { path }, error: null as any };
      },
      getPublicUrl(path: string) {
        return { data: { publicUrl: `https://demo.local/${path}` } };
      },
      async createSignedUrl(path: string) {
        return { data: { signedUrl: `https://demo.local/${path}` }, error: null as any };
      },
      async remove() {
        return { data: [], error: null as any };
      },
    };
  },
};

// --------------------------------------------------------------- realtime --
// A tiny working pub/sub so screens that rely on Realtime (chat is the main
// one) actually update when a row is inserted, instead of silently doing
// nothing. `insert` calls emitRealtime, which fans out to matching listeners.
type RealtimeSub = { table: string; event: string; field?: string; value?: string; cb: (payload: any) => void };
const realtimeSubs: RealtimeSub[] = [];

function emitRealtime(table: string, event: string, row: Row) {
  realtimeSubs.forEach((s) => {
    if (s.table !== table) return;
    if (s.event !== '*' && s.event !== event) return;
    if (s.field && String(row[s.field]) !== String(s.value)) return;
    setTimeout(() => s.cb({ eventType: event, new: row, old: {}, schema: 'public', table }), 0);
  });
}

function channel(_name?: string) {
  const mine: RealtimeSub[] = [];
  const ch: any = {
    on(type: string, opts: any, cb: (payload: any) => void) {
      if (type === 'postgres_changes' && opts?.table) {
        let field: string | undefined;
        let value: string | undefined;
        const m = typeof opts.filter === 'string' ? /([^=]+)=eq\.(.+)/.exec(opts.filter) : null;
        if (m) {
          field = m[1];
          value = m[2];
        }
        const sub: RealtimeSub = { table: opts.table, event: opts.event || '*', field, value, cb };
        mine.push(sub);
        realtimeSubs.push(sub);
      }
      return ch;
    },
    subscribe(cb?: (status: string) => void) {
      if (typeof cb === 'function') setTimeout(() => cb('SUBSCRIBED'), 0);
      return ch;
    },
    unsubscribe() {
      mine.forEach((s) => {
        const i = realtimeSubs.indexOf(s);
        if (i >= 0) realtimeSubs.splice(i, 1);
      });
      return Promise.resolve('ok');
    },
  };
  return ch;
}

// --------------------------------------------------------------------- rpc --
async function rpc(name: string, params?: any) {
  switch (name) {
    case 'discover_circle_nearby':
      return { data: seed.discover_nearby, error: null };
    case 'discover_city_wide':
      return { data: seed.discover_city, error: null };
    case 'is_within_neighbourhood':
      return { data: true, error: null };
    case 'is_verified_member_of_flat':
      return { data: false, error: null };
    case 'search_post_embeddings':
      return { data: [], error: null };
    case 'nearby_verified_neighbours':
      return { data: seed.discover_nearby, error: null };
    case 'serve_ad_for_user':
      return { data: null, error: null };
    case 'create_neighbourhood_at':
      return { data: seed.NBHD_ID, error: null };
    case 'demo_complete_verification':
      return { data: 'm1', error: null };
    case 'request_account_deletion':
      return { data: null, error: null };

    // A neighbour's public profile, shaped the way UserProfileScreen expects.
    // Falls back to the city-discovery list for cross-neighbourhood people.
    case 'get_public_profile': {
      const id = params?.p_target_user_id;
      const p = (tables.profiles as Row[]).find((x) => x.id === id);
      if (p) {
        const membership = (seed.society_memberships as Row[]).find((m) => m.user_id === id);
        return {
          data: {
            name: p.name,
            bio: p.bio ?? null,
            avatar_url: p.avatar_url ?? null,
            vibes: p.vibes ?? [],
            neighbourhood_name: p.neighbourhood?.name ?? 'HSR Layout',
            tower: membership?.tower ?? null,
            flat: membership?.flat ?? null,
            is_same_neighbourhood: true,
          },
          error: null,
        };
      }
      const city = (seed.discover_city as Row[]).find((c) => c.user_id === id);
      if (city) {
        return {
          data: {
            name: city.name,
            bio: null,
            avatar_url: city.avatar_url ?? null,
            vibes: [],
            neighbourhood_name: city.neighbourhood_name,
            tower: null,
            flat: null,
            is_same_neighbourhood: false,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    }

    case 'mutual_circle':
      return { data: [], error: null };

    // Return the existing DM with this person, or spin up a fresh one.
    case 'get_or_create_dm': {
      const otherId = params?.p_other_user_id;
      const meId = readUser()?.id ?? seed.ME_ID;
      const chats = tables.chats as Row[];
      let chat = chats.find(
        (c) => !c.is_group && (c.chat_members ?? []).some((m: Row) => m.user_id === otherId) && (c.chat_members ?? []).some((m: Row) => m.user_id === meId)
      );
      if (!chat) {
        chat = {
          id: 'chat_' + otherId,
          is_group: false,
          name: null,
          emoji: null,
          chat_members: [
            { user_id: meId, user: { name: profileLite(meId)?.name ?? 'You' } },
            { user_id: otherId, user: { name: profileLite(otherId)?.name ?? 'Neighbour' } },
          ],
        };
        chats.unshift(chat);
      }
      return { data: chat.id, error: null };
    }

    case 'get_achievements':
      return {
        data: {
          total_points: 120,
          donations_count: 1,
          events_attended_count: 2,
          validated_alerts_count: 1,
          city_rank: 7,
          city_member_count: 214,
          safety_star: false,
          helping_hand: false,
          scene_regular: false,
        },
        error: null,
      };

    default:
      return { data: null, error: null };
  }
}

export const mockSupabase = {
  auth,
  storage,
  channel,
  removeChannel(ch: any) {
    ch?.unsubscribe?.();
  },
  rpc,
  from(table: string) {
    return new QueryBuilder(table);
  },
} as any;
