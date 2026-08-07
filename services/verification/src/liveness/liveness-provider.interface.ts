// Abstraction over whichever liveness vendor gets picked in Phase 6
// (implementationplan.md Group A) — HyperVerge/FaceTec/IDfy/Signzy all fit
// this same shape. Nothing outside this folder should import a vendor SDK
// directly; inject LIVENESS_PROVIDER instead.

export interface LivenessCheckRequest {
  selfieImageBase64: string;
  gpsLat: number;
  gpsLng: number;
}

export interface LivenessCheckResult {
  passed: boolean;
  confidence: number; // 0–1
  reason?: string;
  provider: string;
}

export const LIVENESS_PROVIDER = Symbol('LIVENESS_PROVIDER');

export interface LivenessProvider {
  checkLiveness(req: LivenessCheckRequest): Promise<LivenessCheckResult>;
}
