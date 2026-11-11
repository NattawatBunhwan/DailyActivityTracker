using System.Text.Json;
using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Application.Interfaces.Services;
using DailyActivityTracker.Domain.Entities;
using DailyActivityTracker.Domain.Enums;
using DailyActivityTracker.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;

namespace DailyActivityTracker.Infrastructure.Services;

public sealed class AuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(
        ApplicationDbContext dbContext,
        ILogger<AuditLogService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task RecordAuthenticationEventAsync(
        string action,
        Guid? userId = null,
        string? actorEmail = null,
        string? actorRole = null,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(action))
        {
            throw new ArgumentException("Audit action is required.", nameof(action));
        }

        try
        {
            var isFailedAuthEvent = action is AuthenticationAuditActions.LoginFailed
                or AuthenticationAuditActions.TokenRefreshFailed;

            var (contextUserId, contextEmail, contextRole, correlationId, ipAddress) = _dbContext.ResolveAuditActorContext();

            var resolvedUserId = isFailedAuthEvent ? null : userId ?? contextUserId;

            var resolvedEmail = !string.IsNullOrWhiteSpace(actorEmail) ? actorEmail.Trim().ToLowerInvariant() : isFailedAuthEvent ? null : contextEmail;

            var resolvedRole = isFailedAuthEvent ? null : !string.IsNullOrWhiteSpace(actorRole) ? actorRole.Trim() : contextRole;

            string? metadataJson = null;
            if (!string.IsNullOrWhiteSpace(reason))
            {
                metadataJson = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    ["reason"] = reason
                });
            }

            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                TimestampUtc = DateTime.UtcNow,
                Category = AuditCategory.Authentication,
                Action = action,
                UserId = resolvedUserId,
                ActorEmail = resolvedEmail,
                ActorRole = resolvedRole,
                EntityName = null,
                EntityId = null,
                OldValues = null,
                NewValues = null,
                Metadata = metadataJson,
                CorrelationId = correlationId,
                IpAddress = ipAddress
            };

            await _dbContext.AuditLogs.AddAsync(auditLog, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(
                ex,
                "Failed to persist authentication audit event {Action} for UserId {UserId}.",
                action,
                userId);
        }
    }
}
