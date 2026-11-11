using DailyActivityTracker.Domain.Enums;

namespace DailyActivityTracker.Domain.Entities;

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

    public AuditCategory Category { get; set; }

    public string Action { get; set; } = string.Empty;

    public Guid? UserId { get; set; }

    public User? User { get; set; }

    public string? ActorEmail { get; set; }

    public string? ActorRole { get; set; }

    public string? EntityName { get; set; }

    public string? EntityId { get; set; }

    public string? OldValues { get; set; }

    public string? NewValues { get; set; }

    public string? Metadata { get; set; }

    public string? CorrelationId { get; set; }

    public string? IpAddress { get; set; }
}
