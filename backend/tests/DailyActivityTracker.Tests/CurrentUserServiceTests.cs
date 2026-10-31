using System.Security.Claims;
using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Infrastructure.Security;
using Microsoft.AspNetCore.Http;
using Moq;

namespace DailyActivityTracker.Tests;

public class CurrentUserServiceTests
{
    [Fact]
    public void UserId_WhenNameIdentifierClaimIsValidGuid_ReturnsParsedGuid()
    {
        // Arrange
        var expectedUserId = Guid.NewGuid();
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, expectedUserId.ToString())
        };
        var service = CreateCurrentUserService(claims);

        // Act
        var result = service.UserId;

        // Assert
        Assert.Equal(expectedUserId, result);
    }

    [Fact]
    public void UserId_WhenNameIdentifierClaimIsMissing_ThrowsUnauthorizedException()
    {
        // Arrange
        var claims = new[]
        {
            new Claim(ClaimTypes.Email, "user@example.com")
        };
        var service = CreateCurrentUserService(claims);

        // Act & Assert
        var ex = Assert.Throws<UnauthorizedException>(() => _ = service.UserId);
        Assert.Equal("The authenticated user does not have the required claim.", ex.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void UserId_WhenNameIdentifierClaimIsEmptyOrWhitespace_ThrowsUnauthorizedException(string emptyClaim)
    {
        // Arrange
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, emptyClaim)
        };
        var service = CreateCurrentUserService(claims);

        // Act & Assert
        var ex = Assert.Throws<UnauthorizedException>(() => _ = service.UserId);
        Assert.Equal("The authenticated user does not have the required claim.", ex.Message);
    }

    [Theory]
    [InlineData("not-a-guid")]
    [InlineData("12345")]
    [InlineData("zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz")]
    public void UserId_WhenNameIdentifierClaimIsNotValidGuid_ThrowsUnauthorizedException(string invalidGuid)
    {
        // Arrange
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, invalidGuid)
        };
        var service = CreateCurrentUserService(claims);

        // Act & Assert
        var ex = Assert.Throws<UnauthorizedException>(() => _ = service.UserId);
        Assert.Equal("The authenticated user's identifier is invalid.", ex.Message);
    }

    [Fact]
    public void UserId_WhenHttpContextIsNull_ThrowsUnauthorizedException()
    {
        // Arrange
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns((HttpContext?)null);

        var service = new CurrentUserService(httpContextAccessorMock.Object);

        // Act & Assert
        var ex = Assert.Throws<UnauthorizedException>(() => _ = service.UserId);
        Assert.Equal("The authenticated user does not have the required claim.", ex.Message);
    }

    [Fact]
    public void UserId_WhenUserHasNoClaims_ThrowsUnauthorizedException()
    {
        // Arrange
        var service = CreateCurrentUserService(Array.Empty<Claim>());

        // Act & Assert
        var ex = Assert.Throws<UnauthorizedException>(() => _ = service.UserId);
        Assert.Equal("The authenticated user does not have the required claim.", ex.Message);
    }

    [Fact]
    public void Email_WhenEmailClaimExists_ReturnsClaimValue()
    {
        // Arrange
        const string expectedEmail = "test@example.com";
        var claims = new[]
        {
            new Claim(ClaimTypes.Email, expectedEmail)
        };
        var service = CreateCurrentUserService(claims);

        // Act
        var result = service.Email;

        // Assert
        Assert.Equal(expectedEmail, result);
    }

    [Fact]
    public void Email_WhenEmailClaimIsMissing_ThrowsUnauthorizedException()
    {
        // Arrange
        var service = CreateCurrentUserService(Array.Empty<Claim>());

        // Act & Assert
        var ex = Assert.Throws<UnauthorizedException>(() => _ = service.Email);
        Assert.Equal("The authenticated user does not have the required claim.", ex.Message);
    }

    [Fact]
    public void Role_WhenRoleClaimExists_ReturnsClaimValue()
    {
        // Arrange
        const string expectedRole = "Admin";
        var claims = new[]
        {
            new Claim(ClaimTypes.Role, expectedRole)
        };
        var service = CreateCurrentUserService(claims);

        // Act
        var result = service.Role;

        // Assert
        Assert.Equal(expectedRole, result);
    }

    [Fact]
    public void Role_WhenRoleClaimIsMissing_ThrowsUnauthorizedException()
    {
        // Arrange
        var service = CreateCurrentUserService(Array.Empty<Claim>());

        // Act & Assert
        var ex = Assert.Throws<UnauthorizedException>(() => _ = service.Role);
        Assert.Equal("The authenticated user does not have the required claim.", ex.Message);
    }

    private static CurrentUserService CreateCurrentUserService(IEnumerable<Claim> claims)
    {
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext
        {
            User = principal
        };

        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext);

        return new CurrentUserService(httpContextAccessorMock.Object);
    }
}

