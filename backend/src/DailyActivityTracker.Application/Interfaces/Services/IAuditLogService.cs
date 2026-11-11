namespace DailyActivityTracker.Application.Interfaces.Services;

public interface IAuditLogService
{
    Task RecordAuthenticationEventAsync(
        string action,
        Guid? userId = null,
        string? actorEmail = null,
        string? actorRole = null,
        string? reason = null,
        CancellationToken cancellationToken = default);
}
