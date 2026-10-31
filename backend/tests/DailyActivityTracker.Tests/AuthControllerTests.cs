using DailyActivityTracker.Api.Controllers;
using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Application.DTOs.Auth;
using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Interfaces.Services;
using DailyActivityTracker.Domain.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DailyActivityTracker.Tests;

public class AuthControllerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _controller = new AuthController(_authServiceMock.Object);
    }

    #region Endpoint Logic & Response Tests

    [Fact]
    public async Task Login_WhenServiceSucceeds_ReturnsLoginResponse()
    {
        // Arrange
        var request = new LoginRequest
        {
            Email = "user@example.com",
            Password = "Password123!"
        };

        var expectedResponse = new LoginResponse
        {
            Token = "jwt.token.here",
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            RefreshToken = "refresh.token.here"
        };

        _authServiceMock
            .Setup(s => s.LoginAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.Login(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedResponse, result.Value);
        _authServiceMock.Verify(s => s.LoginAsync(request, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Login_WhenCredentialsAreInvalid_PropagatesInvalidCredentialsException()
    {
        // Arrange
        var request = new LoginRequest
        {
            Email = "user@example.com",
            Password = "WrongPassword"
        };

        _authServiceMock
            .Setup(s => s.LoginAsync(request, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidCredentialsException());

        // Act & Assert
        await Assert.ThrowsAsync<InvalidCredentialsException>(() => _controller.Login(request));
    }

    [Fact]
    public async Task Refresh_WhenServiceSucceeds_ReturnsOkWithLoginResponse()
    {
        // Arrange
        var request = new RefreshTokenRequest
        {
            RefreshToken = "valid.refresh.token"
        };

        var expectedResponse = new LoginResponse
        {
            Token = "new.jwt.token",
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            RefreshToken = "new.refresh.token"
        };

        _authServiceMock
            .Setup(s => s.RefreshAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.Refresh(request, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expectedResponse, okResult.Value);
        _authServiceMock.Verify(s => s.RefreshAsync(request, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Refresh_WhenTokenIsExpiredOrRevoked_PropagatesRefreshTokenExpiredException()
    {
        // Arrange
        var request = new RefreshTokenRequest
        {
            RefreshToken = "revoked.refresh.token"
        };

        _authServiceMock
            .Setup(s => s.RefreshAsync(request, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new RefreshTokenExpiredException());

        // Act & Assert
        await Assert.ThrowsAsync<RefreshTokenExpiredException>(() =>
            _controller.Refresh(request, CancellationToken.None));
    }

    [Fact]
    public async Task Logout_WhenServiceSucceeds_ReturnsNoContent()
    {
        // Arrange
        var request = new LogoutRequest
        {
            RefreshToken = "token.to.logout"
        };

        _authServiceMock
            .Setup(s => s.LogoutAsync(request, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _controller.Logout(request, CancellationToken.None);

        // Assert
        Assert.IsType<NoContentResult>(result);
        _authServiceMock.Verify(s => s.LogoutAsync(request, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Logout_WhenTokenIsInvalidOrExpired_PropagatesRefreshTokenExpiredException()
    {
        // Arrange
        var request = new LogoutRequest
        {
            RefreshToken = "invalid.token"
        };

        _authServiceMock
            .Setup(s => s.LogoutAsync(request, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new RefreshTokenExpiredException());

        // Act & Assert
        await Assert.ThrowsAsync<RefreshTokenExpiredException>(() =>
            _controller.Logout(request, CancellationToken.None));
    }

    [Fact]
    public async Task GetMe_WhenAuthenticated_ReturnsOkWithMeResponse()
    {
        // Arrange
        var expectedMe = new MeResponse
        {
            UserId = Guid.NewGuid(),
            Email = "me@example.com",
            Role = Roles.User
        };

        _authServiceMock
            .Setup(s => s.GetMeAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedMe);

        // Act
        var result = await _controller.GetMe(CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expectedMe, okResult.Value);
        _authServiceMock.Verify(s => s.GetMeAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region Authorization Attribute Reflection Checks

    [Fact]
    public void Login_HasAllowAnonymousAttribute()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.Login));
        Assert.NotNull(method);
        var allowAnon = method.GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: false);
        Assert.NotEmpty(allowAnon);
    }

    [Fact]
    public void Refresh_HasAllowAnonymousAttribute()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.Refresh));
        Assert.NotNull(method);
        var allowAnon = method.GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: false);
        Assert.NotEmpty(allowAnon);
    }

    [Fact]
    public void Logout_HasAuthorizeAttribute()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.Logout));
        Assert.NotNull(method);
        var authAttr = method.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false);
        Assert.NotEmpty(authAttr);
    }

    [Fact]
    public void GetMe_HasAuthorizeAttribute()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.GetMe));
        Assert.NotNull(method);
        var authAttr = method.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false);
        Assert.NotEmpty(authAttr);
    }

    #endregion
}
