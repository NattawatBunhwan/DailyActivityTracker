using DailyActivityTracker.Domain.Entities;

namespace DailyActivityTracker.Application.Interfaces.Repositories;

public interface IActivityRepository
{
    Task<Activity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Activity?> GetByIdAndUserIdAsync(Guid activityId, Guid userId, CancellationToken cancellationToken = default);

    Task<List<Activity>> GetAllByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    
    Task<List<Activity>> GetAllAsync(CancellationToken cancellationToken = default);

    Task AddAsync(Activity activity, CancellationToken cancellationToken = default);

    Task UpdateAsync(Activity activity, CancellationToken cancellationToken = default);

    Task DeleteAsync(Activity activity, CancellationToken cancellationToken = default);
}
