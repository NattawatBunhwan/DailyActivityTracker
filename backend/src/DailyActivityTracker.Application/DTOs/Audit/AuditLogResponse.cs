using DailyActivityTracker.Domain.Enums;

namespace DailyActivityTracker.Application.DTOs.Audit;

public class AuditLogResponse
{
    public Guid Id { get; set; }
    public DateTime TimestampUtc { get; set; }
    public AuditCategory Category { get; set; }
    public string Action { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public string? ActorEmail { get; set; }
    public string? ActorRole { get; set; }
    public string? EntityName { get; set; }
    public string? EntityId { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? Metadata { get; set; }
    public string? CorrelationId { get; set; }
    public string? IpAddress { get; set; }
    public bool IsDeletedUser { get; set; }
}
