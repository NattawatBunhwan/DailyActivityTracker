using DailyActivityTracker.Application.Features.Activities.DTOs;

namespace DailyActivityTracker.Application.Features.Activities.Services;

public interface IActivityService
{
    Task<ActivityResponse> CreateAsync(Guid userId, CreateActivityRequest request, CancellationToken cancellationToken = default);

    Task<List<ActivityResponse>> GetAllAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<ActivityResponse?> GetByIdAsync(Guid activityId, Guid userId, CancellationToken cancellationToken = default);

    Task<ActivityResponse?> UpdateAsync(Guid activityId, Guid userId, UpdateActivityRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid activityId, Guid userId, CancellationToken cancellationToken = default);
}
