// Mirror Prisma enums as plain TypeScript — safe to import outside Prisma context

export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DISABLED'
export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED' | 'ARCHIVED'
export type PlanInterval = 'MONTHLY' | 'YEARLY' | 'ONE_TIME'
export type IntegrationProvider = 'GOOGLE' | 'STRIPE' | 'TRANSACTIONAL_EMAIL'
export type IntegrationStatus =
  | 'NOT_CONNECTED'
  | 'CONNECTED'
  | 'ERROR'
  | 'RECONNECT_REQUIRED'
  | 'DISABLED'
export type AuditActorType = 'USER' | 'ADMIN' | 'SYSTEM' | 'WORKFLOW'
export type AffiliateStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'DISABLED'
export type CommissionStatus = 'PENDING' | 'APPROVED' | 'HOLD' | 'PAID' | 'REVERSED'
export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'

// RBAC role keys — must match seed values in prisma/seed.ts
export const ROLE_KEYS = {
  PLATFORM_SUPER_ADMIN: 'platform_super_admin',
  PLATFORM_ADMIN: 'platform_admin',
  /// Platform Support — read + impersonate for help-desk staff. CAN view
  /// tenants and impersonate (audit-logged); CANNOT edit tenants, edit
  /// plans/secrets, or manage other platform staff.
  PLATFORM_SUPPORT: 'platform_support',
  TENANT_OWNER: 'tenant_owner',
  TENANT_MANAGER: 'tenant_manager',
  TENANT_STAFF: 'tenant_staff',
  AFFILIATE: 'affiliate_partner',
} as const

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS]

export const PLATFORM_ROLES: RoleKey[] = [
  ROLE_KEYS.PLATFORM_SUPER_ADMIN,
  ROLE_KEYS.PLATFORM_ADMIN,
  ROLE_KEYS.PLATFORM_SUPPORT,
]

/** Platform roles that can perform admin-level writes (suspend tenants,
 *  manage plans). Excludes Support. */
export const PLATFORM_ADMIN_ROLES: RoleKey[] = [
  ROLE_KEYS.PLATFORM_SUPER_ADMIN,
  ROLE_KEYS.PLATFORM_ADMIN,
]

/** Super-admin-only roles — secrets, account-email visibility, platform
 *  team management. */
export const PLATFORM_SUPER_ADMIN_ROLES: RoleKey[] = [
  ROLE_KEYS.PLATFORM_SUPER_ADMIN,
]

export const TENANT_ROLES: RoleKey[] = [
  ROLE_KEYS.TENANT_OWNER,
  ROLE_KEYS.TENANT_MANAGER,
  ROLE_KEYS.TENANT_STAFF,
]

// JWT access token payload
export interface TokenPayload {
  sub: string
  email: string
  tenantId: string | null
  roleKey: RoleKey
  isPlatformRole: boolean
  impersonatedBy?: string
  impersonationSessionId?: string
  iat?: number
  exp?: number
}

// Authenticated user attached to Express request
export interface AuthUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  status: UserStatus
  currentTenantId: string | null
  roleKey: RoleKey
  isPlatformRole: boolean
  impersonatedBy?: string
  impersonationSessionId?: string
}

// Standard API response envelope
export interface ApiResponse<T> {
  data: T
  meta?: Record<string, unknown>
}

export interface ApiError {
  code: string
  message: string
  fieldErrors?: Record<string, string[]>
}

export interface ApiErrorResponse {
  errors: ApiError[]
}
