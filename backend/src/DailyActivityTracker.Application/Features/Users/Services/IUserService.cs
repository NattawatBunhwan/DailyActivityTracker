using DailyActivityTracker.Application.Features.Users.DTOs;

namespace DailyActivityTracker.Application.Features.Users.Services;

public interface IUserService
{
    Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default);

    Task<List<UserResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<UserResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<UserResponse?> UpdateAsync(Guid id, UpdateUserRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
