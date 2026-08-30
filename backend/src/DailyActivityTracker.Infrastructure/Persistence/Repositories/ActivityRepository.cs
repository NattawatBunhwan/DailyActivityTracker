using DailyActivityTracker.Application.Features.Activities.DTOs;
using DailyActivityTracker.Application.Interfaces.Repositories;
using DailyActivityTracker.Domain.Entities;
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
        var activities = _dbContext.Activities.Where(activity => activity.UserId == userId);

        if (query.Status.HasValue)
        {
            activities = activities.Where(x => x.Status == query.Status);
        }
        if (query.Priority.HasValue)
        {
            activities = activities.Where(x => x.Priority == query.Priority);
        }
        return activities.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync(cancellationToken);
    }

    public Task<List<Activity>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.Activities.ToListAsync(cancellationToken);
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
}
