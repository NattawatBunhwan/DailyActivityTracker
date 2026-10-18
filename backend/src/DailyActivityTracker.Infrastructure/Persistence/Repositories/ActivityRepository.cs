using DailyActivityTracker.Application.Features.Activities.DTOs;
using DailyActivityTracker.Application.Interfaces.Repositories;
using DailyActivityTracker.Domain.Entities;
using DailyActivityTracker.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace DailyActivityTracker.Infrastructure.Persistence.Repositories;

public class ActivityRepository : IActivityRepository
{
    private readonly ApplicationDbContext _dbContext;

    public ActivityRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Activity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return _dbContext.Activities.FirstOrDefaultAsync(activity => activity.Id == id, cancellationToken);
    }

    public Task<Activity?> GetByIdAndUserIdAsync(Guid activityId, Guid userId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Activities.FirstOrDefaultAsync(activity => activity.Id == activityId && activity.UserId == userId, cancellationToken);
    }

    public Task<List<Activity>> GetAllByUserIdAsync(Guid userId, ActivityQueryParameters query, CancellationToken cancellationToken = default)
    {
        var activities = ApplyFilters(userId, query);
        activities = ApplySorting(activities, query);

        return activities.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync(cancellationToken);
    }

    public Task<List<Activity>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.Activities.ToListAsync(cancellationToken);
    }

    public Task<int> CountByUserIdAsync(Guid userId, ActivityQueryParameters query, CancellationToken cancellationToken = default)
    {
        return ApplyFilters(userId, query).CountAsync(cancellationToken);
    }

    public async Task<ActivitySummaryResponse> GetSummaryByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var activities = _dbContext.Activities.Where(activity => activity.UserId == userId);

        var summary = await activities
            .GroupBy(_ => 1)
            .Select(group => new ActivitySummaryResponse
            {
                TotalActivities = group.Count(),

                PendingCount = group.Count(activity => activity.Status == ActivityStatus.Pending),

                InProgressCount = group.Count(activity => activity.Status == ActivityStatus.InProgress),

                CompletedCount = group.Count(activity => activity.Status == ActivityStatus.Completed)
            })
            .FirstOrDefaultAsync(cancellationToken);

        return summary ?? new ActivitySummaryResponse();
    }

    public async Task AddAsync(Activity activity, CancellationToken cancellationToken = default)
    {
        await _dbContext.Activities.AddAsync(activity, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Activity activity, CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Activity activity, CancellationToken cancellationToken = default)
    {
        _dbContext.Activities.Remove(activity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private IQueryable<Activity> ApplyFilters(Guid userId, ActivityQueryParameters query)
    {
        var activities = _dbContext.Activities.Where(activity => activity.UserId == userId);
        
        if (query.Status.HasValue)
        {
            activities = activities.Where(x => x.Status == query.Status);
        }

        if (query.Priority.HasValue)
        {
            activities = activities.Where(x => x.Priority == query.Priority);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            activities = activities.Where(x => EF.Functions.ILike(x.Title, $"%{query.Search}%") || (x.Description != null && EF.Functions.ILike(x.Description, $"%{query.Search}%")));
        }

        return activities;
    }

    private IQueryable<Activity> ApplySorting(IQueryable<Activity> activities, ActivityQueryParameters query)
    {
        return query.SortBy?.ToLower() switch
        {
            "title" => query.Descending
                ? activities.OrderByDescending(x => x.Title)
                : activities.OrderBy(x => x.Title),

            "status" => query.Descending
                ? activities.OrderByDescending(x => x.Status)
                : activities.OrderBy(x => x.Status),

            "priority" => query.Descending
                ? activities.OrderByDescending(x => x.Priority)
                : activities.OrderBy(x => x.Priority),

            "activitydate" => query.Descending
                ? activities.OrderByDescending(x => x.ActivityDate)
                : activities.OrderBy(x => x.ActivityDate),

            "createdat" => query.Descending
                ? activities.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
                : activities.OrderBy(x =>x.CreatedAt).ThenBy(x => x.Id),

            _ => activities.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
        };
    }
}
