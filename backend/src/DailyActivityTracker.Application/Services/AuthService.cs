using DailyActivityTracker.Application.DTOs.Auth;
using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Interfaces.Repositories;
using DailyActivityTracker.Application.Interfaces.Security;
using DailyActivityTracker.Application.Interfaces.Services;

namespace DailyActivityTracker.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;

    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(IUserRepository userRepository, IJwtTokenGenerator jwtTokenGenerator)
    {
        _userRepository = userRepository;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);

        if (user is null)
        {
            throw new InvalidCredentialsException();
        }

        bool isValidPassword = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

        if (!isValidPassword)
        {
            throw new InvalidCredentialsException();
        }

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new LoginResponse
        {
            Token = token
        };
    }
}
