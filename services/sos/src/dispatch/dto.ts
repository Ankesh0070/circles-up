// TODO(security): like verification.controller.ts, this trusts a
// client-supplied userId rather than verifying a bearer JWT — a known,
// already-established simplification in this codebase (see Group B), but
// worth flagging louder here: SOS is the highest-stakes group, and a real
// launch MUST verify the caller's identity server-side before this ships,
// not trust whatever userId the request body claims.
export interface DispatchSosDto {
  userId: string;
  sosEventId: string;
  lat: number | null;
  lng: number | null;
}

export interface DispatchResult {
  trustedContactsDispatched: number;
  neighboursAlerted: number;
  errors: string[];
}
