import { IsIn } from 'class-validator';

export const ADMIN_AUDIT_REASON_CODES = [
  'ADMIN_REQUEST',
  'SECURITY_REVIEW',
  'COMPROMISED_ACCOUNT',
  'POLICY_VIOLATION',
  'OTHER',
] as const;

export type AdminAuditReasonCode = (typeof ADMIN_AUDIT_REASON_CODES)[number];

export class AdminActionDto {
  @IsIn(ADMIN_AUDIT_REASON_CODES)
  reasonCode!: AdminAuditReasonCode;
}
