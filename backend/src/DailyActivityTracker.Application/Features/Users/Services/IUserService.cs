using DailyActivityTracker.Application.Features.Users.DTOs;

namespace DailyActivityTracker.Application.Features.Users.Services;

public interface IUserService
{
    Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default);

    Task<List<UserResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<UserResponse?> GetByIdAsync(Guid userId, Guid currentUserId, CancellationToken cancellationToken = default);

    Task<UserResponse?> UpdateAsync(Guid userId, Guid currentUserId, UpdateUserRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid userId, Guid currentUserId, CancellationToken cancellationToken = default);
}
