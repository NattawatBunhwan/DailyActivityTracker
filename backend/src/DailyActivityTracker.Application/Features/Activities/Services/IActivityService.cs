using DailyActivityTracker.Application.Features.Activities.DTOs;

namespace DailyActivityTracker.Application.Features.Activities.Services;

public interface IActivityService
{
    Task<ActivityResponse> CreateAsync(Guid userId, CreateActivityRequest request, CancellationToken cancellationToken = default);

    Task<List<ActivityResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<ActivityResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<ActivityResponse?> UpdateAsync(Guid id, UpdateActivityRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
