using DailyActivityTracker.Application.Features.Users.DTOs;
using DailyActivityTracker.Application.Interfaces.Repositories;
using DailyActivityTracker.Domain.Entities;
using DailyActivityTracker.Application.Exceptions;

namespace DailyActivityTracker.Application.Features.Users.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var existingUser = await _userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);

        if (existingUser is not null)
        {
            throw new EmailAlreadyExistsException(normalizedEmail);
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new User
        {
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            Role = "User",
            FirstName = request.FirstName,
            LastName = request.LastName,
            Age = request.Age,
            Occupation = request.Occupation
        };

        await _userRepository.AddAsync(user, cancellationToken);

        return MapToResponse(user);
    }

    public async Task<List<UserResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var users = await _userRepository.GetAllAsync(cancellationToken);

        return users.Select(MapToResponse).ToList();
    }

    public async Task<UserResponse?> GetByIdAsync(Guid userId, Guid currentUserId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAndUserIdAsync(userId, currentUserId, cancellationToken);

        return user is null ? throw new UserNotFoundException(userId) : MapToResponse(user);
    }

    public async Task<UserResponse?> UpdateAsync(Guid userId, Guid currentUserId, UpdateUserRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAndUserIdAsync(userId, currentUserId, cancellationToken);

        if (user is null)
        {
            throw new UserNotFoundException(userId);
        }

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Age = request.Age;
        user.Occupation = request.Occupation;

        await _userRepository.UpdateAsync(user, cancellationToken);

        return MapToResponse(user);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid currentUserId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAndUserIdAsync(userId, currentUserId, cancellationToken);

        if (user is null)
        {
            throw new UserNotFoundException(userId);
        }

        await _userRepository.DeleteAsync(user, cancellationToken);

        return true;
    }

    private static UserResponse MapToResponse(User user)
    {
        return new UserResponse
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Age = user.Age,
            Occupation = user.Occupation
        };
    }
}
