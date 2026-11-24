using DailyActivityTracker.Api.Controllers;
using DailyActivityTracker.Api.Services;
using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Application.DTOs.Auth;
using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Interfaces.Services;
using DailyActivityTracker.Domain.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DailyActivityTracker.Tests;

public class AuthControllerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly Mock<IAuthCookieService> _authCookieServiceMock;
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _authCookieServiceMock = new Mock<IAuthCookieService>();
        _controller = new AuthController(_authServiceMock.Object, _authCookieServiceMock.Object);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    #region Endpoint Logic & Response Tests

    [Fact]
    public async Task Login_WhenServiceSucceeds_ReturnsLoginResponseAndSetsCookie()
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
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var responseValue = Assert.IsType<LoginResponse>(okResult.Value);
        Assert.Equal("jwt.token.here", responseValue.Token);
        Assert.Equal(string.Empty, responseValue.RefreshToken); // RefreshToken omitted from JSON
        _authCookieServiceMock.Verify(c => c.SetRefreshTokenCookie(It.IsAny<HttpResponse>(), "refresh.token.here", null), Times.Once);
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
    public async Task Refresh_WhenCookiePresentAndServiceSucceeds_ReturnsOkAndRotatesCookie()
    {
        // Arrange
        _authCookieServiceMock
            .Setup(c => c.GetRefreshToken(It.IsAny<HttpRequest>()))
            .Returns("cookie.refresh.token");

        var expectedResponse = new LoginResponse
        {
            Token = "new.jwt.token",
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            RefreshToken = "new.cookie.token"
        };

        _authServiceMock
            .Setup(s => s.RefreshAsync(It.Is<RefreshTokenRequest>(r => r.RefreshToken == "cookie.refresh.token"), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.Refresh(null, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var responseValue = Assert.IsType<LoginResponse>(okResult.Value);
        Assert.Equal("new.jwt.token", responseValue.Token);
        Assert.Equal(string.Empty, responseValue.RefreshToken);
        _authCookieServiceMock.Verify(c => c.SetRefreshTokenCookie(It.IsAny<HttpResponse>(), "new.cookie.token", null), Times.Once);
    }

    [Fact]
    public async Task Refresh_WhenCookieMissing_ThrowsRefreshTokenExpiredExceptionAndClearsCookie()
    {
        // Arrange
        _authCookieServiceMock
            .Setup(c => c.GetRefreshToken(It.IsAny<HttpRequest>()))
            .Returns((string?)null);

        // Act & Assert
        await Assert.ThrowsAsync<RefreshTokenExpiredException>(() =>
            _controller.Refresh(null, CancellationToken.None));

        _authCookieServiceMock.Verify(c => c.ClearRefreshTokenCookie(It.IsAny<HttpResponse>()), Times.Once);
    }

    [Fact]
    public async Task Logout_WhenCalled_ClearsCookieAndRevokesToken()
    {
        // Arrange
        _authCookieServiceMock
            .Setup(c => c.GetRefreshToken(It.IsAny<HttpRequest>()))
            .Returns("cookie.to.logout");

        _authServiceMock
            .Setup(s => s.LogoutAsync(It.Is<LogoutRequest>(r => r.RefreshToken == "cookie.to.logout"), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _controller.Logout(null, CancellationToken.None);

        // Assert
        Assert.IsType<NoContentResult>(result);
        _authCookieServiceMock.Verify(c => c.ClearRefreshTokenCookie(It.IsAny<HttpResponse>()), Times.Once);
        _authServiceMock.Verify(s => s.LogoutAsync(It.Is<LogoutRequest>(r => r.RefreshToken == "cookie.to.logout"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Logout_WhenTokenIsAlreadyExpired_ClearsCookieAndSucceeds()
    {
        // Arrange
        _authCookieServiceMock
            .Setup(c => c.GetRefreshToken(It.IsAny<HttpRequest>()))
            .Returns("expired.token");

        _authServiceMock
            .Setup(s => s.LogoutAsync(It.IsAny<LogoutRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new RefreshTokenExpiredException());

        // Act
        var result = await _controller.Logout(null, CancellationToken.None);

        // Assert
        Assert.IsType<NoContentResult>(result);
        _authCookieServiceMock.Verify(c => c.ClearRefreshTokenCookie(It.IsAny<HttpResponse>()), Times.Once);
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
    public void Refresh_HasValidateOriginAttribute()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.Refresh));
        Assert.NotNull(method);
        var originAttr = method.GetCustomAttributes(typeof(DailyActivityTracker.Api.Filters.ValidateOriginAttribute), inherit: false);
        Assert.NotEmpty(originAttr);
    }

    [Fact]
    public void Logout_HasValidateOriginAttribute()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.Logout));
        Assert.NotNull(method);
        var originAttr = method.GetCustomAttributes(typeof(DailyActivityTracker.Api.Filters.ValidateOriginAttribute), inherit: false);
        Assert.NotEmpty(originAttr);
    }

    [Fact]
    public void Logout_HasAllowAnonymousAttribute()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.Logout));
        Assert.NotNull(method);
        var allowAnon = method.GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: false);
        Assert.NotEmpty(allowAnon);
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
