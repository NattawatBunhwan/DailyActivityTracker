export const AuditCategory = {
    Authentication: 1,
    Data: 2,
} as const

export type AuditCategory = (typeof AuditCategory)[keyof typeof AuditCategory]

export type AuditLogResponse = {
    id: string
    timestampUtc: string
    category: AuditCategory
    action: string
    userId?: string | null
    actorEmail?: string | null
    actorRole?: string | null
    entityName?: string | null
    entityId?: string | null
    oldValues?: string | null
    newValues?: string | null
    metadata?: string | null
    correlationId?: string | null
    ipAddress?: string | null
    isDeletedUser?: boolean
}

export type PagedAuditLogsResponse = {
    items: AuditLogResponse[]
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasPreviousPage?: boolean
    hasNextPage?: boolean
}

export type AuditLogQuery = {
    page?: number
    pageSize?: number
    category?: AuditCategory
    action?: string
    userId?: string
    from?: string
    to?: string
}

export type AuditFilterOptionsQuery = {
    category?: AuditCategory
    action?: string
}

export type AuditUserOption = {
    userId: string
    email?: string | null
    displayName?: string | null
    role?: string | null
    isDeleted?: boolean
}

export type AuditFilterOptionsResponse = {
    actions: string[]
    users: AuditUserOption[]
}
