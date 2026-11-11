using System.Security.Claims;
using System.Text.Json;
using DailyActivityTracker.Domain.Common;
using DailyActivityTracker.Domain.Entities;
using DailyActivityTracker.Domain.Enums;
using DailyActivityTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;

namespace DailyActivityTracker.Tests;

public class ActivityAuditingDbContextTests
{
    [Fact]
    public async Task SaveChangesAsync_WhenActivityCreated_GeneratesOneActivityCreatedAuditRecord()
    {
        // Arrange
        var actorUserId = Guid.NewGuid();
        const string actorEmail = "auditor@example.com";
        const string actorRole = Roles.User;
        const string traceId = "trace-create-001";

        await using var context = CreateInterceptedContext(
            actorUserId,
            actorEmail,
            actorRole,
            traceId,
            out var interceptor);

        var activityId = Guid.NewGuid();
        var activityDate = new DateTime(2026, 11, 2, 9, 30, 0, DateTimeKind.Utc);
        var activity = new Activity
        {
            Id = activityId,
            UserId = actorUserId,
            Title = "Morning workout",
            Description = "30 minutes cardio",
            ActivityDate = activityDate,
            Status = ActivityStatus.InProgress,
            Priority = ActivityPriority.High
        };

        // Act
        await context.Activities.AddAsync(activity);
        await context.SaveChangesAsync();

        // Assert
        var auditLog = Assert.Single(interceptor.AddedAuditLogs);
        Assert.NotEqual(Guid.Empty, auditLog.Id);
        Assert.Equal(AuditCategory.Data, auditLog.Category);
        Assert.Equal("ActivityCreated", auditLog.Action);
        Assert.Equal("Activity", auditLog.EntityName);
        Assert.Equal(activityId.ToString(), auditLog.EntityId);
        Assert.Equal(actorUserId, auditLog.UserId);
        Assert.Equal(actorEmail, auditLog.ActorEmail);
        Assert.Equal(actorRole, auditLog.ActorRole);
        Assert.Equal(traceId, auditLog.CorrelationId);
        Assert.Equal("203.0.113.10", auditLog.IpAddress);
        Assert.Null(auditLog.OldValues);
        Assert.NotNull(auditLog.NewValues);

        using var doc = JsonDocument.Parse(auditLog.NewValues);
        var root = doc.RootElement;
        Assert.Equal(actorUserId.ToString(), root.GetProperty(nameof(Activity.UserId)).GetString());
        Assert.Equal("Morning workout", root.GetProperty(nameof(Activity.Title)).GetString());
        Assert.Equal("30 minutes cardio", root.GetProperty(nameof(Activity.Description)).GetString());
        Assert.Equal("InProgress", root.GetProperty(nameof(Activity.Status)).GetString());
        Assert.Equal("High", root.GetProperty(nameof(Activity.Priority)).GetString());
        Assert.False(root.TryGetProperty(nameof(Activity.User), out _));
    }

    [Fact]
    public async Task SaveChangesAsync_WhenActivityUpdated_GeneratesOneActivityUpdatedAuditRecord()
    {
        // Arrange
        var actorUserId = Guid.NewGuid();
        const string actorEmail = "user@example.com";
        const string actorRole = Roles.User;

        await using var context = CreateInterceptedContext(
            actorUserId,
            actorEmail,
            actorRole,
            "trace-update-001",
            out var interceptor);

        var activity = CreateAttachedActivity(context, actorUserId);

        // Act
        activity.Title = "Updated Title";
        activity.Status = ActivityStatus.Completed;
        await context.SaveChangesAsync();

        // Assert
        var auditLog = Assert.Single(interceptor.AddedAuditLogs);
        Assert.Equal(AuditCategory.Data, auditLog.Category);
        Assert.Equal("ActivityUpdated", auditLog.Action);
        Assert.Equal("Activity", auditLog.EntityName);
        Assert.Equal(activity.Id.ToString(), auditLog.EntityId);
        Assert.Equal(actorUserId, auditLog.UserId);
        Assert.Equal(actorEmail, auditLog.ActorEmail);
        Assert.Equal(actorRole, auditLog.ActorRole);
        Assert.NotNull(auditLog.OldValues);
        Assert.NotNull(auditLog.NewValues);
    }

    [Fact]
    public async Task SaveChangesAsync_WhenActivityUpdated_OldValuesAndNewValuesContainOnlyChangedProperties()
    {
        // Arrange
        var actorUserId = Guid.NewGuid();
        await using var context = CreateInterceptedContext(
            actorUserId,
            "user@example.com",
            Roles.User,
            "trace-diff-001",
            out var interceptor);

        var activity = CreateAttachedActivity(
            context,
            actorUserId,
            title: "Initial Title",
            description: "Unchanged Description",
            status: ActivityStatus.Pending,
            priority: ActivityPriority.Low);

        // Act: change only Title and Status; keep Description, Priority, ActivityDate, UserId unchanged
        activity.Title = "Revised Title";
        activity.Status = ActivityStatus.Completed;
        await context.SaveChangesAsync();

        // Assert
        var auditLog = Assert.Single(interceptor.AddedAuditLogs);
        Assert.NotNull(auditLog.OldValues);
        Assert.NotNull(auditLog.NewValues);

        using var oldDoc = JsonDocument.Parse(auditLog.OldValues);
        using var newDoc = JsonDocument.Parse(auditLog.NewValues);

        var oldProps = oldDoc.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetString());
        var newProps = newDoc.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetString());

        Assert.Equal(2, oldProps.Count);
        Assert.Equal(2, newProps.Count);

        Assert.Equal("Initial Title", oldProps[nameof(Activity.Title)]);
        Assert.Equal("Revised Title", newProps[nameof(Activity.Title)]);

        Assert.Equal("Pending", oldProps[nameof(Activity.Status)]);
        Assert.Equal("Completed", newProps[nameof(Activity.Status)]);

        Assert.DoesNotContain(nameof(Activity.Description), oldProps.Keys);
        Assert.DoesNotContain(nameof(Activity.Priority), oldProps.Keys);
        Assert.DoesNotContain(nameof(Activity.ActivityDate), oldProps.Keys);
        Assert.DoesNotContain(nameof(Activity.UserId), oldProps.Keys);
    }

    [Fact]
    public async Task SaveChangesAsync_WhenActivityUpdatedWithoutMeaningfulChanges_DoesNotGenerateAuditRecord()
    {
        // Arrange
        var actorUserId = Guid.NewGuid();
        await using var context = CreateInterceptedContext(
            actorUserId,
            "user@example.com",
            Roles.User,
            "trace-noop-001",
            out var interceptor);

        var activity = CreateAttachedActivity(
            context,
            actorUserId,
            title: "Same Title",
            description: "Same Description",
            status: ActivityStatus.Pending,
            priority: ActivityPriority.Medium);

        // Force Modified state or reassign identical values
        context.Entry(activity).State = EntityState.Modified;
        activity.Title = "Same Title";
        activity.Description = "Same Description";

        // Act
        await context.SaveChangesAsync();

        // Assert
        Assert.Empty(interceptor.AddedAuditLogs);
    }

    [Fact]
    public async Task SaveChangesAsync_WhenActivityDeleted_GeneratesOneActivityDeletedAuditRecordWithPreviousValues()
    {
        // Arrange
        var actorUserId = Guid.NewGuid();
        await using var context = CreateInterceptedContext(
            actorUserId,
            "user@example.com",
            Roles.User,
            "trace-delete-001",
            out var interceptor);

        var activity = CreateAttachedActivity(
            context,
            actorUserId,
            title: "Activity To Delete",
            description: "Detailed notes before deletion",
            status: ActivityStatus.Cancelled,
            priority: ActivityPriority.Low);

        // Act
        context.Activities.Remove(activity);
        await context.SaveChangesAsync();

        // Assert
        var auditLog = Assert.Single(interceptor.AddedAuditLogs);
        Assert.Equal(AuditCategory.Data, auditLog.Category);
        Assert.Equal("ActivityDeleted", auditLog.Action);
        Assert.Equal("Activity", auditLog.EntityName);
        Assert.Equal(activity.Id.ToString(), auditLog.EntityId);
        Assert.Null(auditLog.NewValues);
        Assert.NotNull(auditLog.OldValues);

        using var oldDoc = JsonDocument.Parse(auditLog.OldValues);
        var root = oldDoc.RootElement;
        Assert.Equal("Activity To Delete", root.GetProperty(nameof(Activity.Title)).GetString());
        Assert.Equal("Detailed notes before deletion", root.GetProperty(nameof(Activity.Description)).GetString());
        Assert.Equal("Cancelled", root.GetProperty(nameof(Activity.Status)).GetString());
        Assert.Equal("Low", root.GetProperty(nameof(Activity.Priority)).GetString());
    }

    [Fact]
    public async Task SaveChangesAsync_WhenMultipleActivityChangesInSingleUnitOfWork_GeneratesCorrespondingAuditRecordsWithSameTimestamp()
    {
        // Arrange
        var actorUserId = Guid.NewGuid();
        await using var context = CreateInterceptedContext(
            actorUserId,
            "user@example.com",
            Roles.Admin,
            "trace-batch-001",
            out var interceptor);

        var existingToUpdate = CreateAttachedActivity(context, actorUserId, title: "Before Update");
        var existingToDelete = CreateAttachedActivity(context, actorUserId, title: "Before Delete");
        var newlyCreated = new Activity
        {
            Id = Guid.NewGuid(),
            UserId = actorUserId,
            Title = "Newly Created",
            ActivityDate = new DateTime(2026, 11, 2, 12, 0, 0, DateTimeKind.Utc),
            Status = ActivityStatus.Pending,
            Priority = ActivityPriority.High
        };

        // Act
        await context.Activities.AddAsync(newlyCreated);
        existingToUpdate.Title = "After Update";
        context.Activities.Remove(existingToDelete);

        await context.SaveChangesAsync();

        // Assert
        Assert.Equal(3, interceptor.AddedAuditLogs.Count);

        var createdLog = Assert.Single(interceptor.AddedAuditLogs, l => l.Action == "ActivityCreated");
        var updatedLog = Assert.Single(interceptor.AddedAuditLogs, l => l.Action == "ActivityUpdated");
        var deletedLog = Assert.Single(interceptor.AddedAuditLogs, l => l.Action == "ActivityDeleted");

        Assert.Equal(newlyCreated.Id.ToString(), createdLog.EntityId);
        Assert.Equal(existingToUpdate.Id.ToString(), updatedLog.EntityId);
        Assert.Equal(existingToDelete.Id.ToString(), deletedLog.EntityId);

        // Verify consistent unit-of-work UTC timestamp across all generated records
        Assert.Equal(createdLog.TimestampUtc, updatedLog.TimestampUtc);
        Assert.Equal(createdLog.TimestampUtc, deletedLog.TimestampUtc);
    }

    [Fact]
    public void SaveChanges_WhenAuditLogIsModified_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = CreateInterceptedContext(null, null, null, null, out _);
        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            Category = AuditCategory.Data,
            Action = "ActivityCreated",
            EntityName = "Activity",
            EntityId = Guid.NewGuid().ToString()
        };

        context.AuditLogs.Attach(auditLog);
        auditLog.Action = "TamperedAction";

        // Act & Assert
        var ex = Assert.Throws<InvalidOperationException>(() => context.SaveChanges());
        Assert.Contains("append-only", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void SaveChanges_WhenAuditLogIsDeleted_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = CreateInterceptedContext(null, null, null, null, out _);
        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            Category = AuditCategory.Data,
            Action = "ActivityCreated",
            EntityName = "Activity",
            EntityId = Guid.NewGuid().ToString()
        };

        context.AuditLogs.Attach(auditLog);
        context.AuditLogs.Remove(auditLog);

        // Act & Assert
        var ex = Assert.Throws<InvalidOperationException>(() => context.SaveChanges());
        Assert.Contains("append-only", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SaveChangesAsync_WhenAuditLogIsModifiedOrDeleted_ThrowsInvalidOperationException()
    {
        // Arrange — Modified case
        await using (var modifyContext = CreateInterceptedContext(null, null, null, null, out _))
        {
            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                Category = AuditCategory.Data,
                Action = "ActivityCreated"
            };

            modifyContext.AuditLogs.Attach(auditLog);
            auditLog.Action = "ModifiedAction";

            var modifyEx = await Assert.ThrowsAsync<InvalidOperationException>(() => modifyContext.SaveChangesAsync());
            Assert.Contains("append-only", modifyEx.Message, StringComparison.OrdinalIgnoreCase);
        }

        // Arrange — Deleted case
        await using (var deleteContext = CreateInterceptedContext(null, null, null, null, out _))
        {
            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                Category = AuditCategory.Data,
                Action = "ActivityCreated"
            };

            deleteContext.AuditLogs.Attach(auditLog);
            deleteContext.AuditLogs.Remove(auditLog);

            var deleteEx = await Assert.ThrowsAsync<InvalidOperationException>(() => deleteContext.SaveChangesAsync());
            Assert.Contains("append-only", deleteEx.Message, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task SaveChangesAsync_PreservesBaseEntityTimestampsAndDoesNotAuditNonActivityEntities()
    {
        // Arrange
        var actorUserId = Guid.NewGuid();
        await using var context = CreateInterceptedContext(
            actorUserId,
            "user@example.com",
            Roles.User,
            "trace-timestamps-001",
            out var interceptor);

        var originalCreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var existingActivity = CreateAttachedActivity(
            context,
            actorUserId,
            title: "Existing Activity",
            createdAt: originalCreatedAt);

        var newActivity = new Activity
        {
            Id = Guid.NewGuid(),
            UserId = actorUserId,
            Title = "New Activity",
            ActivityDate = new DateTime(2026, 11, 2, 8, 0, 0, DateTimeKind.Utc),
            Status = ActivityStatus.Pending,
            Priority = ActivityPriority.Low
        };

        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "newuser@example.com",
            PasswordHash = "hashed-secret-value",
            FirstName = "Test",
            LastName = "User"
        };

        // Act
        await context.Users.AddAsync(newUser);
        await context.Activities.AddAsync(newActivity);
        existingActivity.Title = "Updated Existing Activity";

        await context.SaveChangesAsync();

        // Assert BaseEntity timestamp behavior
        Assert.NotEqual(default, newActivity.CreatedAt);
        Assert.Equal(DateTimeKind.Utc, newActivity.CreatedAt.Kind);
        Assert.Null(newActivity.UpdatedAt);

        Assert.Equal(originalCreatedAt, existingActivity.CreatedAt);
        Assert.NotNull(existingActivity.UpdatedAt);
        Assert.Equal(DateTimeKind.Utc, existingActivity.UpdatedAt.Value.Kind);

        // Assert User creation also received BaseEntity timestamps, but did NOT generate an AuditLog
        Assert.NotEqual(default, newUser.CreatedAt);
        Assert.Equal(2, interceptor.AddedAuditLogs.Count);
        Assert.All(interceptor.AddedAuditLogs, log => Assert.Equal("Activity", log.EntityName));
    }

    private static Activity CreateAttachedActivity(
        ApplicationDbContext context,
        Guid userId,
        string title = "Sample Activity",
        string? description = "Sample Description",
        ActivityStatus status = ActivityStatus.Pending,
        ActivityPriority priority = ActivityPriority.Medium,
        DateTime? createdAt = null)
    {
        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = title,
            Description = description,
            ActivityDate = new DateTime(2026, 10, 15, 10, 0, 0, DateTimeKind.Utc),
            Status = status,
            Priority = priority,
            CreatedAt = createdAt ?? new DateTime(2026, 10, 1, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = null
        };

        context.Activities.Attach(activity);
        return activity;
    }

    private static ApplicationDbContext CreateInterceptedContext(
        Guid? userId,
        string? email,
        string? role,
        string? traceIdentifier,
        out InMemorySaveChangesSuppressionInterceptor interceptor)
    {
        interceptor = new InMemorySaveChangesSuppressionInterceptor();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql("Host=localhost;Database=daily_activity_tracker_unit_test;Username=postgres;Password=postgres")
            .AddInterceptors(interceptor)
            .Options;

        IHttpContextAccessor? httpContextAccessor = null;

        if (userId.HasValue || email is not null || role is not null || traceIdentifier is not null)
        {
            var claims = new List<Claim>();
            if (userId.HasValue)
            {
                claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()));
            }
            if (email is not null)
            {
                claims.Add(new Claim(ClaimTypes.Email, email));
            }
            if (role is not null)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var identity = claims.Count > 0
                ? new ClaimsIdentity(claims, "TestAuthType")
                : new ClaimsIdentity();

            var httpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            };

            if (traceIdentifier is not null)
            {
                httpContext.TraceIdentifier = traceIdentifier;
            }

            httpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("203.0.113.10");

            var mockAccessor = new Mock<IHttpContextAccessor>();
            mockAccessor.Setup(a => a.HttpContext).Returns(httpContext);
            httpContextAccessor = mockAccessor.Object;
        }

        return new ApplicationDbContext(options, httpContextAccessor);
    }

    private sealed class InMemorySaveChangesSuppressionInterceptor : SaveChangesInterceptor
    {
        public List<AuditLog> AddedAuditLogs { get; } = [];

        public override InterceptionResult<int> SavingChanges(
            DbContextEventData eventData,
            InterceptionResult<int> result)
        {
            CaptureStagedAuditLogs(eventData.Context);
            return InterceptionResult<int>.SuppressWithResult(1);
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            CaptureStagedAuditLogs(eventData.Context);
            return ValueTask.FromResult(InterceptionResult<int>.SuppressWithResult(1));
        }

        private void CaptureStagedAuditLogs(DbContext? context)
        {
            if (context is null)
            {
                return;
            }

            var addedLogs = context.ChangeTracker.Entries<AuditLog>()
                .Where(e => e.State == EntityState.Added)
                .Select(e => e.Entity)
                .ToList();

            AddedAuditLogs.AddRange(addedLogs);
        }
    }
}
