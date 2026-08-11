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
  // Keep the seed "me" profile in sync so the typed name shows up everywhere.
  const me = seed.profiles.find((p) => p.id === seed.ME_ID);
  if (me) {
    me.name = user.name;
    me.username = user.name.toLowerCase().replace(/\s+/g, '') || 'you';
  }
  notifyAuth('SIGNED_IN');
  return user;
}

export function mockCurrentUser(): MockUser | null {
  return readUser();
}

const auth = {
  async getSession() {
    return { data: { session: sessionOf(readUser()) }, error: null };
  },
  async getUser() {
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
    const user = mockSignIn(email?.split('@')[0] ?? 'You', email);
    return { data: { user, session: sessionOf(user) }, error: null as any };
  },
  async signInWithOtp() {
    return { data: {}, error: null as any };
  },
  async verifyOtp() {
    const user = readUser() ?? mockSignIn('You');
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
  conversations: seed.conversations,
  messages: seed.messages,
  notifications: seed.notifications,
  safety_alerts: seed.safety_alerts,
  // Write-heavy / relationship tables that screens read but we keep empty:
  hidden_posts: [],
  muted_users: [],
  blocked_users: [],
  circle_connections: [],
  reactions: [],
  saved_posts: [],
  trusted_contacts: [],
  event_attendees: [],
  page_followers: [],
  donations: [],
  ads: [],
  stories: [],
  reports: [],
};

function tableFor(name: string): Row[] {
  if (!(name in tables)) tables[name] = [];
  return tables[name];
}

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
      const inserted = items.map((it) => ({ id: it.id ?? uuid(), created_at: new Date().toISOString(), ...it }));
      // upsert: replace rows with matching id
      inserted.forEach((row) => {
        const idx = store.findIndex((r) => r.id === row.id);
        if (idx >= 0) store[idx] = { ...store[idx], ...row };
        else store.unshift(row);
      });
      const data = this.singleMode !== 'none' ? inserted[0] ?? null : inserted;
      return { data, error: null };
    }

    if (this.mode === 'update') {
      const matched = this.applyFilters(store);
      matched.forEach((row) => Object.assign(row, this.payload));
      const data = this.singleMode !== 'none' ? matched[0] ?? null : matched;
      return { data, error: null };
    }

    if (this.mode === 'delete') {
      const matched = this.applyFilters(store);
      matched.forEach((row) => {
        const idx = store.indexOf(row);
        if (idx >= 0) store.splice(idx, 1);
      });
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
function channel() {
  const ch: any = {
    on() { return ch; },
    subscribe() { return ch; },
    unsubscribe() { return Promise.resolve('ok'); },
  };
  return ch;
}

// --------------------------------------------------------------------- rpc --
async function rpc(name: string, _params?: any) {
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
    default:
      return { data: null, error: null };
  }
}

export const mockSupabase = {
  auth,
  storage,
  channel,
  removeChannel() {},
  rpc,
  from(table: string) {
    return new QueryBuilder(table);
  },
} as any;
