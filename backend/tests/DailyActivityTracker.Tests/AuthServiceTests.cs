using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Application.DTOs.Auth;
using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Interfaces.Repositories;
using DailyActivityTracker.Application.Interfaces.Security;
using DailyActivityTracker.Application.Interfaces.Services;
using DailyActivityTracker.Application.Services;
using DailyActivityTracker.Domain.Common;
using DailyActivityTracker.Domain.Entities;
using Moq;

namespace DailyActivityTracker.Tests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IJwtTokenGenerator> _jwtTokenGeneratorMock;
    private readonly Mock<IRefreshTokenRepository> _refreshTokenRepositoryMock;
    private readonly Mock<ICurrentUserService> _currentUserServiceMock;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _jwtTokenGeneratorMock = new Mock<IJwtTokenGenerator>();
        _refreshTokenRepositoryMock = new Mock<IRefreshTokenRepository>();
        _currentUserServiceMock = new Mock<ICurrentUserService>();

        _authService = new AuthService(
            _userRepositoryMock.Object,
            _jwtTokenGeneratorMock.Object,
            _refreshTokenRepositoryMock.Object,
            _currentUserServiceMock.Object);
    }

    #region LoginAsync Tests

    [Fact]
    public async Task LoginAsync_WhenCredentialsAreValid_ReturnsTokenAndStoresRefreshToken()
    {
        // Arrange
        var password = "CorrectPassword123!";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            PasswordHash = passwordHash,
            Role = Roles.User
        };

        var expectedExpiresAt = DateTime.UtcNow.AddMinutes(60);
        var tokenResult = new TokenResult
        {
            Token = "valid.jwt.access_token",
            ExpiresAt = expectedExpiresAt
        };

        _userRepositoryMock
            .Setup(repo => repo.GetByEmailAsync("test@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        _jwtTokenGeneratorMock
            .Setup(gen => gen.GenerateToken(user))
            .Returns(tokenResult);

        var request = new LoginRequest
        {
            Email = "  TEST@example.com  ", // Test normalization / trim
            Password = password
        };

        // Act
        var response = await _authService.LoginAsync(request);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("valid.jwt.access_token", response.Token);
        Assert.Equal(expectedExpiresAt, response.ExpiresAt);
        Assert.False(string.IsNullOrWhiteSpace(response.RefreshToken));

        _userRepositoryMock.Verify(repo => repo.GetByEmailAsync("test@example.com", It.IsAny<CancellationToken>()), Times.Once);
        _jwtTokenGeneratorMock.Verify(gen => gen.GenerateToken(user), Times.Once);
        _refreshTokenRepositoryMock.Verify(repo => repo.AddAsync(It.Is<RefreshToken>(rt =>
            rt.UserId == user.Id &&
            rt.Token == response.RefreshToken &&
            !rt.IsRevoked &&
            rt.ExpiresAt > DateTime.UtcNow), It.IsAny<CancellationToken>()), Times.Once);
        _refreshTokenRepositoryMock.Verify(repo => repo.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_WhenUserNotFound_ThrowsInvalidCredentialsException()
    {
        // Arrange
        _userRepositoryMock
            .Setup(repo => repo.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var request = new LoginRequest
        {
            Email = "unknown@example.com",
            Password = "Password123!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidCredentialsException>(() => _authService.LoginAsync(request));

        _jwtTokenGeneratorMock.Verify(gen => gen.GenerateToken(It.IsAny<User>()), Times.Never);
        _refreshTokenRepositoryMock.Verify(repo => repo.AddAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Never);
        _refreshTokenRepositoryMock.Verify(repo => repo.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task LoginAsync_WhenPasswordIsIncorrect_ThrowsInvalidCredentialsException()
    {
        // Arrange
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword123!");
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@example.com",
            PasswordHash = passwordHash,
            Role = Roles.User
        };

        _userRepositoryMock
            .Setup(repo => repo.GetByEmailAsync("user@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var request = new LoginRequest
        {
            Email = "user@example.com",
            Password = "WrongPassword123!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidCredentialsException>(() => _authService.LoginAsync(request));

        _jwtTokenGeneratorMock.Verify(gen => gen.GenerateToken(It.IsAny<User>()), Times.Never);
        _refreshTokenRepositoryMock.Verify(repo => repo.AddAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Never);
        _refreshTokenRepositoryMock.Verify(repo => repo.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region RefreshAsync Tests

    [Fact]
    public async Task RefreshAsync_WhenRefreshTokenIsValid_RotatesTokenAndReturnsNewTokens()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingToken = "existing-valid-refresh-token";
        var existingRefreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = existingToken,
            ExpiresAt = DateTime.UtcNow.AddDays(3),
            IsRevoked = false
        };

        var user = new User
        {
            Id = userId,
            Email = "user@example.com",
            Role = Roles.User
        };

        var expectedExpiresAt = DateTime.UtcNow.AddMinutes(60);
        var tokenResult = new TokenResult
        {
            Token = "new.jwt.access_token",
            ExpiresAt = expectedExpiresAt
        };

        _refreshTokenRepositoryMock
            .Setup(repo => repo.GetByTokenAsync(existingToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingRefreshToken);

        _userRepositoryMock
            .Setup(repo => repo.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        _jwtTokenGeneratorMock
            .Setup(gen => gen.GenerateToken(user))
            .Returns(tokenResult);

        var request = new RefreshTokenRequest
        {
            RefreshToken = existingToken
        };

        // Act
        var response = await _authService.RefreshAsync(request);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("new.jwt.access_token", response.Token);
        Assert.Equal(expectedExpiresAt, response.ExpiresAt);
        Assert.False(string.IsNullOrWhiteSpace(response.RefreshToken));
        Assert.NotEqual(existingToken, response.RefreshToken);

        // Existing token must be revoked
        Assert.True(existingRefreshToken.IsRevoked);

        // New token must be added and changes saved
        _refreshTokenRepositoryMock.Verify(repo => repo.AddAsync(It.Is<RefreshToken>(rt =>
            rt.UserId == userId &&
            rt.Token == response.RefreshToken &&
            !rt.IsRevoked &&
            rt.ExpiresAt > DateTime.UtcNow), It.IsAny<CancellationToken>()), Times.Once);
        _refreshTokenRepositoryMock.Verify(repo => repo.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RefreshAsync_WhenRefreshTokenDoesNotExist_ThrowsRefreshTokenExpiredException()
    {
        // Arrange
        _refreshTokenRepositoryMock
            .Setup(repo => repo.GetByTokenAsync("unknown-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync((RefreshToken?)null);

        var request = new RefreshTokenRequest
        {
            RefreshToken = "unknown-token"
        };

        // Act & Assert
        await Assert.ThrowsAsync<RefreshTokenExpiredException>(() => _authService.RefreshAsync(request));

        _userRepositoryMock.Verify(repo => repo.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        _jwtTokenGeneratorMock.Verify(gen => gen.GenerateToken(It.IsAny<User>()), Times.Never);
        _refreshTokenRepositoryMock.Verify(repo => repo.AddAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RefreshAsync_WhenRefreshTokenIsRevoked_ThrowsRefreshTokenExpiredException()
    {
        // Arrange
        var revokedToken = new RefreshToken
        {
            UserId = Guid.NewGuid(),
            Token = "revoked-token",
            ExpiresAt = DateTime.UtcNow.AddDays(2),
            IsRevoked = true
        };

        _refreshTokenRepositoryMock
            .Setup(repo => repo.GetByTokenAsync("revoked-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(revokedToken);

        var request = new RefreshTokenRequest
        {
            RefreshToken = "revoked-token"
        };

        // Act & Assert
        await Assert.ThrowsAsync<RefreshTokenExpiredException>(() => _authService.RefreshAsync(request));

        _jwtTokenGeneratorMock.Verify(gen => gen.GenerateToken(It.IsAny<User>()), Times.Never);
        _refreshTokenRepositoryMock.Verify(repo => repo.AddAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RefreshAsync_WhenRefreshTokenIsExpired_ThrowsRefreshTokenExpiredException()
    {
        // Arrange
        var expiredToken = new RefreshToken
        {
            UserId = Guid.NewGuid(),
            Token = "expired-token",
            ExpiresAt = DateTime.UtcNow.AddSeconds(-10),
            IsRevoked = false
        };

        _refreshTokenRepositoryMock
            .Setup(repo => repo.GetByTokenAsync("expired-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(expiredToken);

        var request = new RefreshTokenRequest
        {
            RefreshToken = "expired-token"
        };

        // Act & Assert
        await Assert.ThrowsAsync<RefreshTokenExpiredException>(() => _authService.RefreshAsync(request));

        _jwtTokenGeneratorMock.Verify(gen => gen.GenerateToken(It.IsAny<User>()), Times.Never);
        _refreshTokenRepositoryMock.Verify(repo => repo.AddAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RefreshAsync_WhenUserNotFoundForValidToken_ThrowsInvalidCredentialsException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var validToken = new RefreshToken
        {
            UserId = userId,
            Token = "valid-token-deleted-user",
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            IsRevoked = false
        };

        _refreshTokenRepositoryMock
            .Setup(repo => repo.GetByTokenAsync("valid-token-deleted-user", It.IsAny<CancellationToken>()))
            .ReturnsAsync(validToken);

        _userRepositoryMock
            .Setup(repo => repo.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var request = new RefreshTokenRequest
        {
            RefreshToken = "valid-token-deleted-user"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidCredentialsException>(() => _authService.RefreshAsync(request));

        _jwtTokenGeneratorMock.Verify(gen => gen.GenerateToken(It.IsAny<User>()), Times.Never);
        _refreshTokenRepositoryMock.Verify(repo => repo.AddAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region LogoutAsync Tests

    [Fact]
    public async Task LogoutAsync_WhenTokenIsValid_RevokesTokenAndSavesChanges()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = "token-to-revoke";
        var refreshToken = new RefreshToken
        {
            UserId = userId,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(2),
            IsRevoked = false
        };

        var user = new User
        {
            Id = userId,
            Email = "user@example.com"
        };

        _refreshTokenRepositoryMock
            .Setup(repo => repo.GetByTokenAsync(token, It.IsAny<CancellationToken>()))
            .ReturnsAsync(refreshToken);

        _userRepositoryMock
            .Setup(repo => repo.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var request = new LogoutRequest
        {
            RefreshToken = token
        };

        // Act
        await _authService.LogoutAsync(request);

        // Assert
        Assert.True(refreshToken.IsRevoked);
        _refreshTokenRepositoryMock.Verify(repo => repo.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task LogoutAsync_WhenTokenDoesNotExist_ThrowsRefreshTokenExpiredException()
    {
        // Arrange
        _refreshTokenRepositoryMock
            .Setup(repo => repo.GetByTokenAsync("non-existent-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync((RefreshToken?)null);

        var request = new LogoutRequest
        {
            RefreshToken = "non-existent-token"
        };

        // Act & Assert
        await Assert.ThrowsAsync<RefreshTokenExpiredException>(() => _authService.LogoutAsync(request));

        _refreshTokenRepositoryMock.Verify(repo => repo.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task LogoutAsync_WhenTokenAlreadyRevoked_ThrowsRefreshTokenExpiredException()
    {
        // Arrange
        var alreadyRevokedToken = new RefreshToken
        {
            UserId = Guid.NewGuid(),
            Token = "already-revoked",
            ExpiresAt = DateTime.UtcNow.AddDays(2),
            IsRevoked = true
        };

        _refreshTokenRepositoryMock
            .Setup(repo => repo.GetByTokenAsync("already-revoked", It.IsAny<CancellationToken>()))
            .ReturnsAsync(alreadyRevokedToken);

        var request = new LogoutRequest
        {
            RefreshToken = "already-revoked"
        };

        // Act & Assert
        await Assert.ThrowsAsync<RefreshTokenExpiredException>(() => _authService.LogoutAsync(request));

        _refreshTokenRepositoryMock.Verify(repo => repo.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task LogoutAsync_WhenTokenIsExpired_ThrowsRefreshTokenExpiredException()
    {
        // Arrange
        var expiredToken = new RefreshToken
        {
            UserId = Guid.NewGuid(),
            Token = "expired-token",
            ExpiresAt = DateTime.UtcNow.AddHours(-1),
            IsRevoked = false
        };

        _refreshTokenRepositoryMock
            .Setup(repo => repo.GetByTokenAsync("expired-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(expiredToken);

        var request = new LogoutRequest
        {
            RefreshToken = "expired-token"
        };

        // Act & Assert
        await Assert.ThrowsAsync<RefreshTokenExpiredException>(() => _authService.LogoutAsync(request));

        _refreshTokenRepositoryMock.Verify(repo => repo.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task LogoutAsync_WhenUserNotFoundForToken_ThrowsInvalidCredentialsException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = new RefreshToken
        {
            UserId = userId,
            Token = "token-user-deleted",
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            IsRevoked = false
        };

        _refreshTokenRepositoryMock
            .Setup(repo => repo.GetByTokenAsync("token-user-deleted", It.IsAny<CancellationToken>()))
            .ReturnsAsync(token);

        _userRepositoryMock
            .Setup(repo => repo.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var request = new LogoutRequest
        {
            RefreshToken = "token-user-deleted"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidCredentialsException>(() => _authService.LogoutAsync(request));

        Assert.False(token.IsRevoked);
        _refreshTokenRepositoryMock.Verify(repo => repo.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region GetMeAsync Tests

    [Fact]
    public async Task GetMeAsync_WhenUserClaimsExist_ReturnsMeResponse()
    {
        // Arrange
        var expectedUserId = Guid.NewGuid();
        const string expectedEmail = "me@example.com";
        const string expectedRole = "User";

        _currentUserServiceMock.Setup(s => s.UserId).Returns(expectedUserId);
        _currentUserServiceMock.Setup(s => s.Email).Returns(expectedEmail);
        _currentUserServiceMock.Setup(s => s.Role).Returns(expectedRole);

        // Act
        var result = await _authService.GetMeAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedUserId, result.UserId);
        Assert.Equal(expectedEmail, result.Email);
        Assert.Equal(expectedRole, result.Role);
    }

    [Fact]
    public async Task GetMeAsync_WhenCurrentUserServiceThrows_PropagatesException()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.UserId)
            .Throws(new UnauthorizedException("The authenticated user does not have the required claim."));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _authService.GetMeAsync());
        Assert.Equal("The authenticated user does not have the required claim.", ex.Message);
    }

    #endregion
}

