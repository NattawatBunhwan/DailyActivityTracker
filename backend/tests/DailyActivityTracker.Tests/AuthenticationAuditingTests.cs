using System.Security.Claims;
using System.Text.Json;
using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Application.DTOs.Auth;
using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Interfaces.Repositories;
using DailyActivityTracker.Application.Interfaces.Security;
using DailyActivityTracker.Application.Interfaces.Services;
using DailyActivityTracker.Application.Services;
using DailyActivityTracker.Domain.Common;
using DailyActivityTracker.Domain.Entities;
using DailyActivityTracker.Domain.Enums;
using DailyActivityTracker.Infrastructure.Persistence;
using DailyActivityTracker.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Moq;

namespace DailyActivityTracker.Tests;

public class AuthenticationAuditingTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IJwtTokenGenerator> _jwtTokenGeneratorMock;
    private readonly Mock<IRefreshTokenRepository> _refreshTokenRepositoryMock;
    private readonly Mock<ICurrentUserService> _currentUserServiceMock;
    private readonly Mock<ILogger<AuditLogService>> _loggerMock;

    public AuthenticationAuditingTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _jwtTokenGeneratorMock = new Mock<IJwtTokenGenerator>();
        _refreshTokenRepositoryMock = new Mock<IRefreshTokenRepository>();
        _currentUserServiceMock = new Mock<ICurrentUserService>();
        _loggerMock = new Mock<ILogger<AuditLogService>>();
    }

    [Fact]
    public async Task LoginAsync_WhenCredentialsAreValid_CreatesExactlyOneLoginSucceededEvent()
    {
        // Arrange
        const string rawPassword = "ValidSecretPassword123!";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "alice@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword),
            Role = Roles.User
        };

        var tokenResult = new TokenResult
        {
            Token = "jwt.access.token.secret.value",
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };

        _userRepositoryMock
            .Setup(r => r.GetByEmailAsync("alice@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        _jwtTokenGeneratorMock
            .Setup(g => g.GenerateToken(user))
            .Returns(tokenResult);

        await using var dbContext = CreateInterceptedDbContext("trace-login-success", out var interceptor);
        var auditLogService = new AuditLogService(dbContext, _loggerMock.Object);
        var authService = CreateAuthService(auditLogService);

        var request = new LoginRequest
        {
            Email = "  ALICE@example.com ",
            Password = rawPassword
        };

        // Act
        var response = await authService.LoginAsync(request);

        // Assert
        Assert.Equal(tokenResult.Token, response.Token);
        var auditLog = Assert.Single(interceptor.AddedAuditLogs);
        Assert.Equal(AuditCategory.Authentication, auditLog.Category);
        Assert.Equal(AuthenticationAuditActions.LoginSucceeded, auditLog.Action);
        Assert.Equal(user.Id, auditLog.UserId);
        Assert.Equal("alice@example.com", auditLog.ActorEmail);
        Assert.Equal(Roles.User, auditLog.ActorRole);
        Assert.Equal("trace-login-success", auditLog.CorrelationId);
        Assert.Equal("198.51.100.25", auditLog.IpAddress);
        Assert.NotEqual(default, auditLog.TimestampUtc);
        Assert.Equal(DateTimeKind.Utc, auditLog.TimestampUtc.Kind);

        AssertNoSensitiveValuesContained(
            auditLog,
            rawPassword,
            user.PasswordHash,
            response.Token,
            response.RefreshToken);
    }

    [Fact]
    public async Task LoginAsync_WhenPasswordIsIncorrect_CreatesExactlyOneLoginFailedEventAndNoSuccessEvent()
    {
        // Arrange
        const string correctPassword = "CorrectPassword123!";
        const string attemptedPassword = "WrongPassword999!";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "bob@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(correctPassword),
            Role = Roles.Admin
        };

        _userRepositoryMock
            .Setup(r => r.GetByEmailAsync("bob@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        await using var dbContext = CreateInterceptedDbContext("trace-login-bad-pwd", out var interceptor);
        var auditLogService = new AuditLogService(dbContext, _loggerMock.Object);
        var authService = CreateAuthService(auditLogService);

        var request = new LoginRequest
        {
            Email = "bob@example.com",
            Password = attemptedPassword
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidCredentialsException>(() => authService.LoginAsync(request));

        var auditLog = Assert.Single(interceptor.AddedAuditLogs);
        Assert.Equal(AuditCategory.Authentication, auditLog.Category);
        Assert.Equal(AuthenticationAuditActions.LoginFailed, auditLog.Action);
        Assert.DoesNotContain(interceptor.AddedAuditLogs, l => l.Action == AuthenticationAuditActions.LoginSucceeded);
        Assert.Null(auditLog.UserId);
        Assert.Equal("bob@example.com", auditLog.ActorEmail);
        Assert.Null(auditLog.ActorRole);
        Assert.Equal("trace-login-bad-pwd", auditLog.CorrelationId);

        AssertNoSensitiveValuesContained(
            auditLog,
            correctPassword,
            attemptedPassword,
            user.PasswordHash);
    }

    [Fact]
    public async Task LoginAsync_WhenEmailIsUnknown_CreatesOneLoginFailedEventWithNullUserId()
    {
        // Arrange
        const string attemptedPassword = "SomeAttemptedPassword123!";

        _userRepositoryMock
            .Setup(r => r.GetByEmailAsync("unknown@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        await using var dbContext = CreateInterceptedDbContext("trace-login-unknown", out var interceptor);
        var auditLogService = new AuditLogService(dbContext, _loggerMock.Object);
        var authService = CreateAuthService(auditLogService);

        var request = new LoginRequest
        {
            Email = "  Unknown@Example.COM  ",
            Password = attemptedPassword
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidCredentialsException>(() => authService.LoginAsync(request));

        var auditLog = Assert.Single(interceptor.AddedAuditLogs);
        Assert.Equal(AuditCategory.Authentication, auditLog.Category);
        Assert.Equal(AuthenticationAuditActions.LoginFailed, auditLog.Action);
        Assert.Null(auditLog.UserId);
        Assert.Equal("unknown@example.com", auditLog.ActorEmail);
        Assert.Null(auditLog.ActorRole);
        Assert.Equal("trace-login-unknown", auditLog.CorrelationId);

        AssertNoSensitiveValuesContained(auditLog, attemptedPassword);
    }

    [Fact]
    public async Task RefreshAsync_WhenRefreshTokenIsValid_CreatesOneTokenRefreshSucceededEvent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        const string incomingRefreshToken = "incoming-raw-refresh-token-value";
        var existingToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = incomingRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(5),
            IsRevoked = false
        };

        var user = new User
        {
            Id = userId,
            Email = "refreshuser@example.com",
            Role = Roles.User
        };

        var tokenResult = new TokenResult
        {
            Token = "new.jwt.access.token.value",
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };

        _refreshTokenRepositoryMock
            .Setup(r => r.GetByTokenAsync(incomingRefreshToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingToken);

        _userRepositoryMock
            .Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        _jwtTokenGeneratorMock
            .Setup(g => g.GenerateToken(user))
            .Returns(tokenResult);

        await using var dbContext = CreateInterceptedDbContext("trace-refresh-ok", out var interceptor);
        var auditLogService = new AuditLogService(dbContext, _loggerMock.Object);
        var authService = CreateAuthService(auditLogService);

        var request = new RefreshTokenRequest
        {
            RefreshToken = incomingRefreshToken
        };

        // Act
        var response = await authService.RefreshAsync(request);

        // Assert
        Assert.True(existingToken.IsRevoked);
        var auditLog = Assert.Single(interceptor.AddedAuditLogs);
        Assert.Equal(AuditCategory.Authentication, auditLog.Category);
        Assert.Equal(AuthenticationAuditActions.TokenRefreshSucceeded, auditLog.Action);
        Assert.Equal(userId, auditLog.UserId);
        Assert.Equal("refreshuser@example.com", auditLog.ActorEmail);
        Assert.Equal(Roles.User, auditLog.ActorRole);
        Assert.Equal("trace-refresh-ok", auditLog.CorrelationId);

        AssertNoSensitiveValuesContained(
            auditLog,
            incomingRefreshToken,
            response.Token,
            response.RefreshToken);
    }

    [Theory]
    [InlineData("not-found")]
    [InlineData("revoked")]
    [InlineData("expired")]
    public async Task RefreshAsync_WhenRefreshTokenIsInvalidRevokedOrExpired_CreatesOneTokenRefreshFailedEvent(string failureScenario)
    {
        // Arrange
        var tokenOwnerId = Guid.NewGuid();
        const string suppliedRefreshToken = "sensitive-supplied-refresh-token-987654";

        RefreshToken? storedToken = failureScenario switch
        {
            "not-found" => null,
            "revoked" => new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = tokenOwnerId,
                Token = suppliedRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(1),
                IsRevoked = true
            },
            "expired" => new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = tokenOwnerId,
                Token = suppliedRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(-5),
                IsRevoked = false
            },
            _ => null
        };

        _refreshTokenRepositoryMock
            .Setup(r => r.GetByTokenAsync(suppliedRefreshToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync(storedToken);

        await using var dbContext = CreateInterceptedDbContext("trace-refresh-fail", out var interceptor);
        var auditLogService = new AuditLogService(dbContext, _loggerMock.Object);
        var authService = CreateAuthService(auditLogService);

        var request = new RefreshTokenRequest
        {
            RefreshToken = suppliedRefreshToken
        };

        // Act & Assert
        await Assert.ThrowsAsync<RefreshTokenExpiredException>(() => authService.RefreshAsync(request));

        var auditLog = Assert.Single(interceptor.AddedAuditLogs);
        Assert.Equal(AuditCategory.Authentication, auditLog.Category);
        Assert.Equal(AuthenticationAuditActions.TokenRefreshFailed, auditLog.Action);
        Assert.DoesNotContain(interceptor.AddedAuditLogs, l => l.Action == AuthenticationAuditActions.TokenRefreshSucceeded);
        Assert.Null(auditLog.UserId);
        Assert.Null(auditLog.ActorEmail);
        Assert.Null(auditLog.ActorRole);
        Assert.Equal("trace-refresh-fail", auditLog.CorrelationId);

        AssertNoSensitiveValuesContained(auditLog, suppliedRefreshToken);
    }

    [Fact]
    public async Task LogoutAsync_WhenTokenIsValid_CreatesOneLogoutSucceededEventAfterRevocation()
    {
        // Arrange
        var userId = Guid.NewGuid();
        const string logoutRefreshToken = "logout-raw-refresh-token-secret";
        var existingToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = logoutRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(3),
            IsRevoked = false
        };

        var user = new User
        {
            Id = userId,
            Email = "logoutuser@example.com",
            Role = Roles.User
        };

        _refreshTokenRepositoryMock
            .Setup(r => r.GetByTokenAsync(logoutRefreshToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingToken);

        _userRepositoryMock
            .Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        await using var dbContext = CreateInterceptedDbContext("trace-logout-ok", out var interceptor);
        var auditLogService = new AuditLogService(dbContext, _loggerMock.Object);
        var authService = CreateAuthService(auditLogService);

        var request = new LogoutRequest
        {
            RefreshToken = logoutRefreshToken
        };

        // Act
        await authService.LogoutAsync(request);

        // Assert
        Assert.True(existingToken.IsRevoked);
        _refreshTokenRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);

        var auditLog = Assert.Single(interceptor.AddedAuditLogs);
        Assert.Equal(AuditCategory.Authentication, auditLog.Category);
        Assert.Equal(AuthenticationAuditActions.LogoutSucceeded, auditLog.Action);
        Assert.Equal(userId, auditLog.UserId);
        Assert.Equal("logoutuser@example.com", auditLog.ActorEmail);
        Assert.Equal(Roles.User, auditLog.ActorRole);
        Assert.Equal("trace-logout-ok", auditLog.CorrelationId);

        AssertNoSensitiveValuesContained(auditLog, logoutRefreshToken);
    }

    [Fact]
    public async Task LogoutAsync_WhenTokenIsInvalid_DoesNotCreateLogoutSucceededEvent()
    {
        // Arrange
        _refreshTokenRepositoryMock
            .Setup(r => r.GetByTokenAsync("invalid-logout-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync((RefreshToken?)null);

        await using var dbContext = CreateInterceptedDbContext("trace-logout-fail", out var interceptor);
        var auditLogService = new AuditLogService(dbContext, _loggerMock.Object);
        var authService = CreateAuthService(auditLogService);

        var request = new LogoutRequest
        {
            RefreshToken = "invalid-logout-token"
        };

        // Act & Assert
        await Assert.ThrowsAsync<RefreshTokenExpiredException>(() => authService.LogoutAsync(request));
        Assert.Empty(interceptor.AddedAuditLogs);
    }

    [Fact]
    public async Task RecordAuthenticationEventAsync_WhenDatabaseSaveThrows_LogsErrorAndDoesNotFailLoginOperation()
    {
        // Arrange
        const string rawPassword = "ValidPassword123!";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "resilient@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword),
            Role = Roles.User
        };

        _userRepositoryMock
            .Setup(r => r.GetByEmailAsync("resilient@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        _jwtTokenGeneratorMock
            .Setup(g => g.GenerateToken(user))
            .Returns(new TokenResult
            {
                Token = "jwt.token.value",
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            });

        await using var throwingDbContext = CreateThrowingDbContext();
        var auditLogService = new AuditLogService(throwingDbContext, _loggerMock.Object);
        var authService = CreateAuthService(auditLogService);

        var request = new LoginRequest
        {
            Email = "resilient@example.com",
            Password = rawPassword
        };

        // Act: Login should still succeed even when AuditLog persistence fails
        var response = await authService.LoginAsync(request);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("jwt.token.value", response.Token);
        _loggerMock.Verify(
            l => l.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, _) => v.ToString()!.Contains("Failed to persist authentication audit event")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    private AuthService CreateAuthService(IAuditLogService auditLogService)
    {
        return new AuthService(
            _userRepositoryMock.Object,
            _jwtTokenGeneratorMock.Object,
            _refreshTokenRepositoryMock.Object,
            _currentUserServiceMock.Object,
            auditLogService);
    }

    private static void AssertNoSensitiveValuesContained(AuditLog auditLog, params string[] sensitiveValues)
    {
        var serializedAuditLog = JsonSerializer.Serialize(new
        {
            auditLog.Action,
            auditLog.ActorEmail,
            auditLog.ActorRole,
            auditLog.EntityName,
            auditLog.EntityId,
            auditLog.OldValues,
            auditLog.NewValues,
            auditLog.Metadata,
            auditLog.CorrelationId,
            auditLog.IpAddress
        });

        foreach (var sensitive in sensitiveValues)
        {
            if (!string.IsNullOrEmpty(sensitive))
            {
                Assert.DoesNotContain(sensitive, serializedAuditLog, StringComparison.OrdinalIgnoreCase);
            }
        }
    }

    private static ApplicationDbContext CreateInterceptedDbContext(
        string? traceIdentifier,
        out SaveChangesCaptureInterceptor interceptor)
    {
        interceptor = new SaveChangesCaptureInterceptor();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql("Host=localhost;Database=daily_activity_tracker_unit_test;Username=postgres;Password=postgres")
            .AddInterceptors(interceptor)
            .Options;

        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity())
        };

        if (traceIdentifier is not null)
        {
            httpContext.TraceIdentifier = traceIdentifier;
        }

        httpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("198.51.100.25");

        var accessorMock = new Mock<IHttpContextAccessor>();
        accessorMock.Setup(a => a.HttpContext).Returns(httpContext);

        return new ApplicationDbContext(options, accessorMock.Object);
    }

    private static ApplicationDbContext CreateThrowingDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql("Host=localhost;Database=daily_activity_tracker_unit_test;Username=postgres;Password=postgres")
            .AddInterceptors(new ThrowingSaveChangesInterceptor())
            .Options;

        return new ApplicationDbContext(options);
    }

    private sealed class SaveChangesCaptureInterceptor : SaveChangesInterceptor
    {
        public List<AuditLog> AddedAuditLogs { get; } = [];

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            if (eventData.Context is not null)
            {
                var logs = eventData.Context.ChangeTracker.Entries<AuditLog>()
                    .Where(e => e.State == EntityState.Added)
                    .Select(e => e.Entity)
                    .ToList();

                AddedAuditLogs.AddRange(logs);
            }

            return ValueTask.FromResult(InterceptionResult<int>.SuppressWithResult(1));
        }
    }

    private sealed class ThrowingSaveChangesInterceptor : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            throw new InvalidOperationException("Simulated database write failure.");
        }
    }
}
