import { useEffect, useRef, useState } from "react"
import { X, Calendar, User, Shield, Info, Database, FileText, Copy, Check } from "lucide-react"
import type { AuditLogResponse } from "../../types/audit"
import { AuditCategory } from "../../types/audit"
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll"

type AuditLogDetailsModalProps = {
    log: AuditLogResponse | null
    onClose: () => void
    triggerElement?: HTMLElement | null
}

function formatJson(jsonString?: string | null): string {
    if (!jsonString) return "—"
    try {
        const parsed = JSON.parse(jsonString)
        return JSON.stringify(parsed, null, 2)
    } catch {
        return jsonString
    }
}

function normalizeDisplayValue(val?: string | null): string {
    if (val === undefined || val === null) return "—"
    const trimmed = val.trim()
    if (!trimmed || trimmed.toLowerCase() === "none" || trimmed.toLowerCase() === "null") {
        return "—"
    }
    return trimmed
}

function isDeletedActor(log: AuditLogResponse): boolean {
    if (log.isDeletedUser) return true
    if (log.actorRole?.trim().toLowerCase() === "deleted user") return true
    if (
        !log.userId &&
        Boolean(log.actorEmail?.trim()) &&
        log.action !== "LoginFailed" &&
        log.action !== "TokenRefreshFailed"
    ) {
        return true
    }
    return false
}

function CopyableValue({
    label,
    rawValue,
}: {
    label: string
    rawValue?: string | null
}) {
    const [copied, setCopied] = useState(false)
    const normalized = normalizeDisplayValue(rawValue)
    const hasRealValue = normalized !== "—"

    const handleCopy = async () => {
        if (!hasRealValue) return
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(normalized)
            }
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1800)
        } catch {
            // Ignore clipboard errors gracefully
        }
    }

    return (
        <span className="audit-detail-val audit-detail-val-copyable">
            <span>{normalized}</span>
            {hasRealValue && (
                <button
                    type="button"
                    className="audit-copy-btn"
                    onClick={() => void handleCopy()}
                    aria-label={`Copy ${label}`}
                    title={copied ? "Copied!" : `Copy ${label}`}
                >
                    {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                </button>
            )}
        </span>
    )
}

export function AuditLogDetailsModal({ log, onClose, triggerElement }: AuditLogDetailsModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const closeBtnRef = useRef<HTMLButtonElement>(null)
    const lastTriggerRef = useRef<HTMLElement | null>(null)

    useLockBodyScroll(!!log)

    useEffect(() => {
        if (log) {
            lastTriggerRef.current =
                triggerElement ??
                (document.activeElement instanceof HTMLElement ? document.activeElement : null)
            closeBtnRef.current?.focus()
        } else if (lastTriggerRef.current) {
            const target = lastTriggerRef.current
            lastTriggerRef.current = null
            if (target.isConnected) {
                target.focus({ preventScroll: true })
            }
        }
    }, [log, triggerElement])

    useEffect(() => {
        if (!log) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation()
                onClose()
                return
            }

            if (e.key === "Tab" && dialogRef.current) {
                const focusable = Array.from(
                    dialogRef.current.querySelectorAll<HTMLElement>(
                        [
                            "a[href]",
                            "button:not([disabled])",
                            "input:not([disabled])",
                            "textarea:not([disabled])",
                            "select:not([disabled])",
                            '[tabindex]:not([tabindex="-1"])',
                        ].join(",")
                    )
                ).filter((el) => el.getAttribute("aria-hidden") !== "true")

                if (focusable.length === 0) {
                    e.preventDefault()
                    return
                }

                const first = focusable[0]
                const last = focusable[focusable.length - 1]
                const active = document.activeElement

                if (!dialogRef.current.contains(active)) {
                    e.preventDefault()
                    ;(e.shiftKey ? last : first).focus()
                } else if (e.shiftKey && active === first) {
                    e.preventDefault()
                    last.focus()
                } else if (!e.shiftKey && active === last) {
                    e.preventDefault()
                    first.focus()
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [log, onClose])

    if (!log) return null

    const formattedTime = new Date(log.timestampUtc).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hour12: false,
    })

    const getCategoryBadgeClass = (category: AuditCategory) => {
        switch (category) {
            case AuditCategory.Authentication:
                return "audit-badge audit-badge-auth"
            case AuditCategory.Data:
                return "audit-badge audit-badge-data"
            default:
                return "audit-badge audit-badge-default"
        }
    }

    const getCategoryLabel = (category: AuditCategory) => {
        switch (category) {
            case AuditCategory.Authentication:
                return "Authentication"
            case AuditCategory.Data:
                return "Data"
            default:
                return `Unknown (${category})`
        }
    }

    const getActionBadgeClass = (action: string) => {
        switch (action) {
            case "LoginSucceeded":
            case "TokenRefreshSucceeded":
            case "ActivityCreated":
            case "Created":
                return "audit-badge audit-badge-action-success"
            case "LoginFailed":
            case "TokenRefreshFailed":
            case "ActivityDeleted":
            case "Deleted":
                return "audit-badge audit-badge-action-danger"
            case "ActivityUpdated":
            case "Updated":
                return "audit-badge audit-badge-action-warning"
            case "LogoutSucceeded":
                return "audit-badge audit-badge-action-info"
            default:
                return "audit-badge audit-badge-default"
        }
    }

    const renderActorRoleValue = () => {
        const deleted = isDeletedActor(log)
        const normalizedRole = normalizeDisplayValue(log.actorRole)

        if (deleted) {
            return (
                <span className="audit-role-badges">
                    {normalizedRole !== "—" && normalizedRole.toLowerCase() !== "deleted user" && (
                        <span
                            className={`audit-badge ${
                                normalizedRole.toLowerCase() === "admin"
                                    ? "audit-role-badge--admin"
                                    : "audit-role-badge--user"
                            }`}
                        >
                            {normalizedRole}
                        </span>
                    )}
                    <span className="audit-badge audit-role-badge--deleted">Deleted User</span>
                </span>
            )
        }

        if (normalizedRole === "—") {
            return "—"
        }

        const roleClass =
            normalizedRole.toLowerCase() === "admin"
                ? "audit-role-badge--admin"
                : normalizedRole.toLowerCase() === "user"
                  ? "audit-role-badge--user"
                  : "audit-badge-default"

        return <span className={`audit-badge ${roleClass}`}>{normalizedRole}</span>
    }

    return (
        <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            <div className="modal modal--form" ref={dialogRef}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Info size={20} color="#4f46e5" aria-hidden="true" />
                        <h2 id="audit-modal-title" style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
                            Audit Record Details
                        </h2>
                    </div>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        className="modal-close"
                        aria-label="Close audit log details"
                        onClick={onClose}
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>

                <div className="audit-modal-body">
                    <div className="audit-details-grid">
                        <div className="audit-detail-row">
                            <span className="audit-detail-key">
                                <Calendar size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
                                Local Date &amp; Time
                            </span>
                            <span className="audit-detail-val">{formattedTime}</span>
                        </div>

                        <div className="audit-detail-row">
                            <span className="audit-detail-key">UTC Date &amp; Time</span>
                            <span className="audit-detail-val">{normalizeDisplayValue(log.timestampUtc)}</span>
                        </div>

                        <div className="audit-detail-row">
                            <span className="audit-detail-key">Category</span>
                            <span className="audit-detail-val">
                                <span className={getCategoryBadgeClass(log.category)}>
                                    {getCategoryLabel(log.category)}
                                </span>
                            </span>
                        </div>

                        <div className="audit-detail-row">
                            <span className="audit-detail-key">Action</span>
                            <span className="audit-detail-val">
                                <span className={getActionBadgeClass(log.action)}>{log.action}</span>
                            </span>
                        </div>

                        <div className="audit-detail-row">
                            <span className="audit-detail-key">
                                <User size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
                                Actor Email
                            </span>
                            <span className="audit-detail-val">{normalizeDisplayValue(log.actorEmail)}</span>
                        </div>

                        <div className="audit-detail-row">
                            <span className="audit-detail-key">
                                <Shield size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
                                Actor Role
                            </span>
                            <span className="audit-detail-val">{renderActorRoleValue()}</span>
                        </div>

                        <div className="audit-detail-row">
                            <span className="audit-detail-key">User ID</span>
                            <CopyableValue label="User ID" rawValue={log.userId} />
                        </div>

                        <div className="audit-detail-row">
                            <span className="audit-detail-key">IP Address</span>
                            <CopyableValue label="IP Address" rawValue={log.ipAddress} />
                        </div>

                        <div className="audit-detail-row">
                            <span className="audit-detail-key">
                                <Database size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
                                Entity Type
                            </span>
                            <span className="audit-detail-val">{normalizeDisplayValue(log.entityName)}</span>
                        </div>

                        <div className="audit-detail-row">
                            <span className="audit-detail-key">Target ID</span>
                            <CopyableValue label="Target ID" rawValue={log.entityId} />
                        </div>

                        <div className="audit-detail-row" style={{ gridColumn: "1 / -1" }}>
                            <span className="audit-detail-key">Request ID</span>
                            <CopyableValue label="Request ID" rawValue={log.correlationId} />
                        </div>

                        <div className="audit-detail-row" style={{ gridColumn: "1 / -1" }}>
                            <span className="audit-detail-key">Log ID</span>
                            <span className="audit-detail-val">{normalizeDisplayValue(log.id)}</span>
                        </div>
                    </div>

                    {log.oldValues && (
                        <div className="audit-json-section">
                            <span className="audit-json-label">
                                <FileText size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
                                Old Values
                            </span>
                            <pre className="audit-json-block">
                                <code>{formatJson(log.oldValues)}</code>
                            </pre>
                        </div>
                    )}

                    {log.newValues && (
                        <div className="audit-json-section">
                            <span className="audit-json-label">
                                <FileText size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
                                New Values
                            </span>
                            <pre className="audit-json-block">
                                <code>{formatJson(log.newValues)}</code>
                            </pre>
                        </div>
                    )}

                    {log.metadata && (
                        <div className="audit-json-section">
                            <span className="audit-json-label">
                                <FileText size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
                                Metadata
                            </span>
                            <pre className="audit-json-block">
                                <code>{formatJson(log.metadata)}</code>
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
