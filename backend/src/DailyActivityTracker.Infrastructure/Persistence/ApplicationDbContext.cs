using System.Security.Claims;
using System.Text.Json;
using DailyActivityTracker.Domain.Common;
using DailyActivityTracker.Domain.Entities;
using DailyActivityTracker.Domain.Enums;
using DailyActivityTracker.Infrastructure.Persistence.Configurations;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace DailyActivityTracker.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext
{
    private const string ActivityCreatedAction = "ActivityCreated";
    private const string ActivityUpdatedAction = "ActivityUpdated";
    private const string ActivityDeletedAction = "ActivityDeleted";

    private static readonly string[] ActivityAuditedProperties =
    [
        nameof(Activity.UserId),
        nameof(Activity.Title),
        nameof(Activity.Description),
        nameof(Activity.ActivityDate),
        nameof(Activity.Status),
        nameof(Activity.Priority)
    ];

    private static readonly HashSet<string> SensitivePropertyNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "Password",
        "PasswordHash",
        "Token",
        "RefreshToken",
        "AccessToken",
        "Secret",
        "SecretKey"
    };

    private readonly IHttpContextAccessor? _httpContextAccessor;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        IHttpContextAccessor? httpContextAccessor = null)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public DbSet<User> Users { get; set; }

    public DbSet<Activity> Activities { get; set; }

    public DbSet<RefreshToken> RefreshTokens { get; set; }

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().HasIndex(user => user.Email).IsUnique();

        modelBuilder.Entity<RefreshToken>()
            .HasOne(refreshToken => refreshToken.User)
            .WithMany(user => user.RefreshTokens)
            .HasForeignKey(refreshToken => refreshToken.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.ApplyConfiguration(new AuditLogConfiguration());
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        PrepareChangesBeforeSave();

        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override async Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        PrepareChangesBeforeSave();

        return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return SaveChangesAsync(acceptAllChangesOnSuccess: true, cancellationToken);
    }

    internal (Guid? UserId, string? Email, string? Role, string? CorrelationId, string? IpAddress) ResolveAuditActorContext()
    {
        var httpContext = _httpContextAccessor?.HttpContext;

        if (httpContext is null)
        {
            return (null, null, null, null, null);
        }

        var correlationId = string.IsNullOrWhiteSpace(httpContext.TraceIdentifier)
            ? null
            : httpContext.TraceIdentifier;

        var ipAddress = ResolveClientIpAddress(httpContext);

        var principal = httpContext.User;

        if (principal?.Identity?.IsAuthenticated != true)
        {
            return (null, null, null, correlationId, ipAddress);
        }

        var rawUserId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(rawUserId, out var parsedUserId)
            ? parsedUserId
            : null;

        var rawEmail = principal.FindFirstValue(ClaimTypes.Email);
        var email = string.IsNullOrWhiteSpace(rawEmail)
            ? null
            : rawEmail;

        var rawRole = principal.FindFirstValue(ClaimTypes.Role);
        var role = string.IsNullOrWhiteSpace(rawRole)
            ? null
            : rawRole;

        return (userId, email, role, correlationId, ipAddress);
    }

    private static string? ResolveClientIpAddress(HttpContext httpContext)
    {
        string? rawIp = null;

        if (httpContext.Request?.Headers != null &&
            httpContext.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor) &&
            !string.IsNullOrWhiteSpace(forwardedFor))
        {
            var firstForwarded = forwardedFor.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (firstForwarded.Length > 0 && !string.IsNullOrWhiteSpace(firstForwarded[0]))
            {
                rawIp = firstForwarded[0];
            }
        }

        if (string.IsNullOrWhiteSpace(rawIp))
        {
            rawIp = httpContext.Connection?.RemoteIpAddress?.ToString();
        }

        if (string.IsNullOrWhiteSpace(rawIp))
        {
            return null;
        }

        var trimmed = rawIp.Trim();
        return trimmed.Length > 45 ? trimmed[..45] : trimmed;
    }

    private void PrepareChangesBeforeSave()
    {
        var now = DateTime.UtcNow;

        EnforceAuditLogImmutabilityAndNormalize(now);
        ApplyBaseEntityTimestamps(now);
        StageActivityAuditLogs(now);
        EnforceAuditLogImmutabilityAndNormalize(now);
    }

    private void ApplyBaseEntityTimestamps(DateTime now)
    {
        foreach (var item in ChangeTracker.Entries<BaseEntity>())
        {
            if (item.State == EntityState.Added)
            {
                item.Entity.CreatedAt = now;
                item.Entity.UpdatedAt = null;
            }
            else if (item.State == EntityState.Modified)
            {
                item.Entity.UpdatedAt = now;
                item.Property(x => x.CreatedAt).IsModified = false;
            }
        }
    }

    private void StageActivityAuditLogs(DateTime now)
    {
        var auditableEntries = ChangeTracker.Entries<IAuditableEntity>()
            .Where(entry => entry.Entity is Activity &&
                            entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        if (auditableEntries.Count == 0)
        {
            return;
        }

        var (actorUserId, actorEmail, actorRole, correlationId, ipAddress) = ResolveAuditActorContext();
        var auditLogsToStage = new List<AuditLog>(auditableEntries.Count);

        foreach (var entry in auditableEntries)
        {
            var activityEntry = entry.Context.Entry((Activity)entry.Entity);
            var auditLog = CreateActivityAuditLog(
                activityEntry,
                now,
                actorUserId,
                actorEmail,
                actorRole,
                correlationId,
                ipAddress);

            if (auditLog is not null)
            {
                auditLogsToStage.Add(auditLog);
            }
        }

        if (auditLogsToStage.Count > 0)
        {
            AuditLogs.AddRange(auditLogsToStage);
        }
    }

    private static AuditLog? CreateActivityAuditLog(
        EntityEntry<Activity> entry,
        DateTime now,
        Guid? actorUserId,
        string? actorEmail,
        string? actorRole,
        string? correlationId,
        string? ipAddress)
    {
        EnsureActivityIdForAudit(entry);
        var entityId = entry.Entity.Id.ToString();

        switch (entry.State)
        {
            case EntityState.Added:
            {
                var newValues = BuildSnapshotDictionary(entry, useOriginalValues: false);

                return new AuditLog
                {
                    Id = Guid.NewGuid(),
                    TimestampUtc = now,
                    Category = AuditCategory.Data,
                    Action = ActivityCreatedAction,
                    UserId = actorUserId,
                    ActorEmail = actorEmail,
                    ActorRole = actorRole,
                    EntityName = nameof(Activity),
                    EntityId = entityId,
                    OldValues = null,
                    NewValues = JsonSerializer.Serialize(newValues),
                    CorrelationId = correlationId,
                    IpAddress = ipAddress
                };
            }

            case EntityState.Modified:
            {
                var (oldValues, newValues) = BuildModifiedDiffDictionaries(entry);

                if (newValues.Count == 0)
                {
                    return null;
                }

                return new AuditLog
                {
                    Id = Guid.NewGuid(),
                    TimestampUtc = now,
                    Category = AuditCategory.Data,
                    Action = ActivityUpdatedAction,
                    UserId = actorUserId,
                    ActorEmail = actorEmail,
                    ActorRole = actorRole,
                    EntityName = nameof(Activity),
                    EntityId = entityId,
                    OldValues = JsonSerializer.Serialize(oldValues),
                    NewValues = JsonSerializer.Serialize(newValues),
                    CorrelationId = correlationId,
                    IpAddress = ipAddress
                };
            }

            case EntityState.Deleted:
            {
                var oldValues = BuildSnapshotDictionary(entry, useOriginalValues: true);

                return new AuditLog
                {
                    Id = Guid.NewGuid(),
                    TimestampUtc = now,
                    Category = AuditCategory.Data,
                    Action = ActivityDeletedAction,
                    UserId = actorUserId,
                    ActorEmail = actorEmail,
                    ActorRole = actorRole,
                    EntityName = nameof(Activity),
                    EntityId = entityId,
                    OldValues = JsonSerializer.Serialize(oldValues),
                    NewValues = null,
                    CorrelationId = correlationId,
                    IpAddress = ipAddress
                };
            }

            default:
                return null;
        }
    }

    private static void EnsureActivityIdForAudit(EntityEntry<Activity> entry)
    {
        if (entry.Entity.Id == Guid.Empty)
        {
            entry.Entity.Id = Guid.NewGuid();
        }
    }

    private static Dictionary<string, object?> BuildSnapshotDictionary(
        EntityEntry<Activity> entry,
        bool useOriginalValues)
    {
        var snapshot = new Dictionary<string, object?>(ActivityAuditedProperties.Length);

        foreach (var propertyName in ActivityAuditedProperties)
        {
            if (SensitivePropertyNames.Contains(propertyName))
            {
                continue;
            }

            var property = entry.Property(propertyName);
            var rawValue = useOriginalValues ? property.OriginalValue : property.CurrentValue;
            snapshot[propertyName] = NormalizeSnapshotValue(rawValue);
        }

        return snapshot;
    }

    private static (Dictionary<string, object?> OldValues, Dictionary<string, object?> NewValues) BuildModifiedDiffDictionaries(
        EntityEntry<Activity> entry)
    {
        var oldValues = new Dictionary<string, object?>();
        var newValues = new Dictionary<string, object?>();

        foreach (var propertyName in ActivityAuditedProperties)
        {
            if (SensitivePropertyNames.Contains(propertyName))
            {
                continue;
            }

            var property = entry.Property(propertyName);

            if (!property.IsModified)
            {
                continue;
            }

            var originalValue = NormalizeSnapshotValue(property.OriginalValue);
            var currentValue = NormalizeSnapshotValue(property.CurrentValue);

            if (AreValuesEqual(originalValue, currentValue))
            {
                continue;
            }

            oldValues[propertyName] = originalValue;
            newValues[propertyName] = currentValue;
        }

        return (oldValues, newValues);
    }

    private static object? NormalizeSnapshotValue(object? value)
    {
        return value switch
        {
            null => null,
            Enum enumValue => enumValue.ToString(),
            DateTime dateTimeValue => dateTimeValue.Kind == DateTimeKind.Utc
                ? dateTimeValue
                : DateTime.SpecifyKind(dateTimeValue, DateTimeKind.Utc),
            _ => value
        };
    }

    private static bool AreValuesEqual(object? left, object? right)
    {
        if (ReferenceEquals(left, right))
        {
            return true;
        }

        if (left is null || right is null)
        {
            return false;
        }

        return Equals(left, right);
    }

    private void EnforceAuditLogImmutabilityAndNormalize(DateTime now)
    {
        foreach (var auditEntry in ChangeTracker.Entries<AuditLog>())
        {
            if (auditEntry.State is EntityState.Modified or EntityState.Deleted)
            {
                throw new InvalidOperationException("AuditLog entries are append-only and cannot be modified or deleted.");
            }

            if (auditEntry.State == EntityState.Added)
            {
                if (auditEntry.Entity.Id == Guid.Empty)
                {
                    auditEntry.Entity.Id = Guid.NewGuid();
                }

                if (auditEntry.Entity.TimestampUtc == default)
                {
                    auditEntry.Entity.TimestampUtc = now;
                }
                else if (auditEntry.Entity.TimestampUtc.Kind != DateTimeKind.Utc)
                {
                    auditEntry.Entity.TimestampUtc = DateTime.SpecifyKind(auditEntry.Entity.TimestampUtc, DateTimeKind.Utc);
                }
            }
        }
    }
}
