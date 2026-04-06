// Shared application types
// Database-generated types will be in src/types/database.ts (generated in Phase 2)

export type UserRole = 'admin' | 'mod' | 'viewer'

export type SyncType = 'orders' | 'products' | 'full'
export type SyncStatus = 'started' | 'completed' | 'failed'

export type OrderStatus =
  | 'pending'
  | 'attempt'
  | 'uploaded'
  | 'confirmed'
  | 'exchange'
  | 'rejected'
  | 'in transit'
  | 'delivered'
  | 'returned'

// Standard API response shape for all /api/* routes
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
