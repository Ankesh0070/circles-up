export interface SubmitVerificationDto {
  userId: string;
  neighbourhoodId: string;
  society: string;
  tower?: string;
  flat: string;
  selfieImageBase64: string;
  lat: number;
  lng: number;
  accuracy?: number;
  mocked?: boolean;
  source: 'camera' | 'gallery';
}

export type MembershipStatus = 'pending' | 'verified' | 'rejected';

export interface SubmitVerificationResult {
  membershipId: string;
  status: MembershipStatus;
  reviewReason?: string;
}
