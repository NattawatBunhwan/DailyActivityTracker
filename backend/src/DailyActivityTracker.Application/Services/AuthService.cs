using DailyActivityTracker.Application.DTOs.Auth;
using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Interfaces.Repositories;
using DailyActivityTracker.Application.Interfaces.Security;
using DailyActivityTracker.Application.Interfaces.Services;
using DailyActivityTracker.Domain.Entities;
using System.Security.Cryptography;

namespace DailyActivityTracker.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;

    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    private readonly IRefreshTokenRepository _refreshTokenRepository;

    public AuthService(IUserRepository userRepository, IJwtTokenGenerator jwtTokenGenerator, IRefreshTokenRepository refreshTokenRepository)
    {
        _userRepository = userRepository;
        _jwtTokenGenerator = jwtTokenGenerator;
        _refreshTokenRepository = refreshTokenRepository;
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

        var tokenResult = _jwtTokenGenerator.GenerateToken(user);

        var refreshTokenValue = GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        };

        await _refreshTokenRepository.AddAsync(refreshToken, cancellationToken);
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);
        
        return new LoginResponse
        {
            Token = tokenResult.Token,
            ExpiresAt = tokenResult.ExpiresAt,
            RefreshToken = refreshTokenValue
        };
    }

    public async Task<LoginResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
Console.WriteLine("Incoming:");
Console.WriteLine(request.RefreshToken);


        var refreshToken = await _refreshTokenRepository.GetByTokenAsync(request.RefreshToken, cancellationToken);

        if (refreshToken is null)
        {
            throw new InvalidCredentialsException();
        }

Console.WriteLine("Before:");
Console.WriteLine(refreshToken.Token);
Console.WriteLine(refreshToken.IsRevoked);

        if (refreshToken.IsRevoked)
        {
            throw new InvalidCredentialsException();
        }
        if (refreshToken.ExpiresAt <= DateTime.UtcNow)
        {
            throw new InvalidCredentialsException();
        }

        var user = await _userRepository.GetByIdAsync(refreshToken.UserId, cancellationToken);

        if (user is null)
        {
            throw new InvalidCredentialsException();
        }

        var tokenResult = _jwtTokenGenerator.GenerateToken(user);

        var newRefreshTokenValue = GenerateRefreshToken();

        var newRefreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = newRefreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        };

        refreshToken.IsRevoked = true;

Console.WriteLine("After:");
Console.WriteLine(refreshToken.IsRevoked);

        await _refreshTokenRepository.AddAsync(newRefreshToken, cancellationToken);
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken); 

var check = await _refreshTokenRepository.GetByTokenAsync(request.RefreshToken, cancellationToken);

Console.WriteLine("Database:");
Console.WriteLine(check!.IsRevoked);

        return new LoginResponse
        {
            Token = tokenResult.Token,
            ExpiresAt = tokenResult.ExpiresAt,
            RefreshToken = newRefreshTokenValue
        };
    }
    
    private static string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }
}

