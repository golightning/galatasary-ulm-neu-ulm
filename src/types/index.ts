import type { MemberType, MemberStatus, ScanResult } from "@prisma/client";

export type { MemberType, MemberStatus, ScanResult };

export interface MemberListItem {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
  memberType: MemberType;
  status: MemberStatus;
  joinDate: Date;
  expiryDate: Date;
}

export interface ScanValidationResult {
  valid: boolean;
  result: "valid" | "invalid" | "expired" | "blocked";
  message: string;
  member?: {
    firstName: string;
    lastName: string;
    memberNumber: string;
    memberType: string;
    photoUrl: string | null;
  };
}

export interface ApiError {
  error: string;
  details?: unknown;
}
