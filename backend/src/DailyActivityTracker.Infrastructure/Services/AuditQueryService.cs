using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Application.DTOs.Audit;
using DailyActivityTracker.Application.Interfaces.Services;
using DailyActivityTracker.Domain.Entities;
using DailyActivityTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DailyActivityTracker.Infrastructure.Services;

public class AuditQueryService : IAuditQueryService
{
    private readonly ApplicationDbContext _dbContext;

    public AuditQueryService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResponse<AuditLogResponse>> GetAuditLogsAsync(
        AuditLogQueryParameters query,
        CancellationToken cancellationToken = default)
    {
        var logs = _dbContext.AuditLogs.AsNoTracking();

        if (query.Category.HasValue)
        {
            logs = logs.Where(x => x.Category == query.Category.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            var trimmedAction = query.Action.Trim();
            logs = logs.Where(x => x.Action == trimmedAction);
        }

        if (query.UserId.HasValue)
        {
            var selectedUserId = query.UserId.Value;
            var selectedUserEmail = await _dbContext.Users
                .AsNoTracking()
                .Where(u => u.Id == selectedUserId && !string.IsNullOrWhiteSpace(u.Email))
                .Select(u => u.Email)
                .FirstOrDefaultAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(selectedUserEmail))
            {
                var normalizedEmail = selectedUserEmail.Trim().ToLower();
                logs = logs.Where(x =>
                    x.UserId == selectedUserId ||
                    (!x.UserId.HasValue && x.ActorEmail != null && x.ActorEmail.ToLower() == normalizedEmail));
            }
            else
            {
                logs = logs.Where(x => x.UserId == selectedUserId);
            }
        }

        if (AuditLogQueryParameters.TryParseUtcBoundary(query.From, isUpperBound: false, out var fromUtc, out _, out _) &&
            fromUtc.HasValue)
        {
            logs = logs.Where(x => x.TimestampUtc >= fromUtc.Value);
        }

        if (AuditLogQueryParameters.TryParseUtcBoundary(query.To, isUpperBound: true, out var toUtc, out var isExclusiveTo, out _) &&
            toUtc.HasValue)
        {
            logs = isExclusiveTo
                ? logs.Where(x => x.TimestampUtc < toUtc.Value)
                : logs.Where(x => x.TimestampUtc <= toUtc.Value);
        }

        var totalCount = await logs.CountAsync(cancellationToken);

        var items = await logs
            .OrderByDescending(x => x.TimestampUtc)
            .ThenByDescending(x => x.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(x => new AuditLogResponse
            {
                Id = x.Id,
                TimestampUtc = x.TimestampUtc,
                Category = x.Category,
                Action = x.Action,
                UserId = x.UserId,
                ActorEmail = x.ActorEmail,
                ActorRole = x.ActorRole,
                EntityName = x.EntityName,
                EntityId = x.EntityId,
                OldValues = x.OldValues,
                NewValues = x.NewValues,
                Metadata = x.Metadata,
                CorrelationId = x.CorrelationId,
                IpAddress = x.IpAddress
            })
            .ToListAsync(cancellationToken);

        if (items.Count > 0)
        {
            var distinctUserIds = items
                .Where(x => x.UserId.HasValue)
                .Select(x => x.UserId!.Value)
                .Distinct()
                .ToList();

            var existingUserIds = distinctUserIds.Count > 0
                ? (await _dbContext.Users
                    .AsNoTracking()
                    .Where(u => distinctUserIds.Contains(u.Id))
                    .Select(u => u.Id)
                    .ToListAsync(cancellationToken))
                    .ToHashSet()
                : [];

            var distinctOrphanEmails = items
                .Where(x => !x.UserId.HasValue &&
                            !string.IsNullOrWhiteSpace(x.ActorEmail) &&
                            x.Action != AuthenticationAuditActions.LoginFailed &&
                            x.Action != AuthenticationAuditActions.TokenRefreshFailed)
                .Select(x => x.ActorEmail!)
                .Distinct()
                .ToList();

            var existingEmails = distinctOrphanEmails.Count > 0
                ? (await _dbContext.Users
                    .AsNoTracking()
                    .Where(u => distinctOrphanEmails.Contains(u.Email))
                    .Select(u => u.Email)
                    .ToListAsync(cancellationToken))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase)
                : new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var item in items)
            {
                if (item.UserId.HasValue)
                {
                    item.IsDeletedUser = !existingUserIds.Contains(item.UserId.Value);
                }
                else if (!string.IsNullOrWhiteSpace(item.ActorEmail) &&
                         item.Action != AuthenticationAuditActions.LoginFailed &&
                         item.Action != AuthenticationAuditActions.TokenRefreshFailed)
                {
                    item.IsDeletedUser = !existingEmails.Contains(item.ActorEmail);
                }
            }
        }

        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling((double)totalCount / query.PageSize);

        return new PagedResponse<AuditLogResponse>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };
    }

    public async Task<AuditFilterOptionsResponse> GetFilterOptionsAsync(
        AuditFilterOptionsQueryParameters? query = null,
        CancellationToken cancellationToken = default)
    {
        var categoryFilter = query?.Category;
        var actionFilter = string.IsNullOrWhiteSpace(query?.Action) ? null : query.Action.Trim();

        var actions = await ApplyActionFilterOptionsQuery(
                _dbContext.AuditLogs.AsNoTracking(),
                categoryFilter)
            .ToListAsync(cancellationToken);

        var auditActorsQuery = ApplyUserFilterOptionsQuery(
            _dbContext.AuditLogs.AsNoTracking(),
            categoryFilter,
            actionFilter);

        var auditActors = await auditActorsQuery
            .Select(x => new
            {
                x.UserId,
                x.ActorEmail,
                x.ActorRole,
                x.TimestampUtc
            })
            .ToListAsync(cancellationToken);

        var actorUserIds = auditActors
            .Where(x => x.UserId.HasValue)
            .Select(x => x.UserId!.Value)
            .Distinct()
            .ToList();

        var orphanActorEmails = auditActors
            .Where(x => !x.UserId.HasValue && !string.IsNullOrWhiteSpace(x.ActorEmail))
            .Select(x => x.ActorEmail!.Trim().ToLower())
            .Distinct()
            .ToList();

        var activeUsers = (actorUserIds.Count > 0 || orphanActorEmails.Count > 0)
            ? await _dbContext.Users
                .AsNoTracking()
                .Where(u =>
                    actorUserIds.Contains(u.Id) ||
                    (u.Email != null && orphanActorEmails.Contains(u.Email.ToLower())))
                .Select(u => new
                {
                    u.Id,
                    u.Email,
                    u.FirstName,
                    u.LastName,
                    u.Role
                })
                .ToListAsync(cancellationToken)
            : [];

        var activeUsersById = activeUsers.ToDictionary(u => u.Id);
        var activeUsersByEmail = activeUsers
            .Where(u => !string.IsNullOrWhiteSpace(u.Email))
            .GroupBy(u => u.Email.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var resolvedActors = auditActors
            .Select(x =>
            {
                Guid? resolvedUserId = x.UserId;
                if (!resolvedUserId.HasValue &&
                    !string.IsNullOrWhiteSpace(x.ActorEmail) &&
                    activeUsersByEmail.TryGetValue(x.ActorEmail.Trim(), out var matchedUser))
                {
                    resolvedUserId = matchedUser.Id;
                }

                return new
                {
                    UserId = resolvedUserId,
                    x.ActorEmail,
                    x.ActorRole,
                    x.TimestampUtc
                };
            })
            .Where(x => x.UserId.HasValue)
            .ToList();

        var usersById = new Dictionary<Guid, AuditUserOptionResponse>();

        foreach (var actorGroup in resolvedActors.GroupBy(x => x.UserId!.Value))
        {
            var latestSnapshot = actorGroup
                .OrderByDescending(x => x.TimestampUtc)
                .First();

            var isActive = activeUsersById.TryGetValue(actorGroup.Key, out var activeUser);

            usersById[actorGroup.Key] = new AuditUserOptionResponse
            {
                UserId = actorGroup.Key,
                Email = isActive ? activeUser!.Email : latestSnapshot.ActorEmail,
                DisplayName = isActive ? ($"{activeUser!.FirstName} {activeUser.LastName}".Trim() is { Length: > 0 } fn ? fn : null) : null,
                Role = isActive ? activeUser!.Role : latestSnapshot.ActorRole,
                IsDeleted = !isActive
            };
        }

        var sortedUsers = usersById.Values
            .OrderBy(u => u.IsDeleted)
            .ThenBy(u => u.Email ?? string.Empty, StringComparer.OrdinalIgnoreCase)
            .ThenBy(u => u.UserId)
            .ToList();

        return new AuditFilterOptionsResponse
        {
            Actions = actions,
            Users = sortedUsers
        };
    }

    public static IQueryable<string> ApplyActionFilterOptionsQuery(
        IQueryable<AuditLog> source,
        Domain.Enums.AuditCategory? categoryFilter)
    {
        var query = source.Where(x => !string.IsNullOrWhiteSpace(x.Action));

        if (categoryFilter.HasValue)
        {
            query = query.Where(x => x.Category == categoryFilter.Value);
        }

        return query
            .Select(x => x.Action)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .OrderBy(x => x);
    }

    public static IQueryable<AuditLog> ApplyUserFilterOptionsQuery(
        IQueryable<AuditLog> source,
        Domain.Enums.AuditCategory? categoryFilter,
        string? actionFilter)
    {
        var query = source.Where(x => x.UserId.HasValue || !string.IsNullOrWhiteSpace(x.ActorEmail));

        if (categoryFilter.HasValue)
        {
            query = query.Where(x => x.Category == categoryFilter.Value);
        }

        if (!string.IsNullOrWhiteSpace(actionFilter))
        {
            var trimmedAction = actionFilter.Trim();
            query = query.Where(x => x.Action == trimmedAction);
        }

        return query;
    }
}
