using System.Text.Json;
using DailyActivityTracker.Api.Filters;
using DailyActivityTracker.Application.DTOs.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace DailyActivityTracker.Tests;

public class AuthSecurityTests
{
    [Fact]
    public void LoginResponse_Serialization_NeverContainsRefreshTokenProperty()
    {
        // Arrange
        var response = new LoginResponse
        {
            Token = "access.jwt.token",
            ExpiresAt = DateTime.UtcNow.AddMinutes(15),
            RefreshToken = "secret.refresh.token"
        };

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        // Act
        var json = JsonSerializer.Serialize(response, options);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // Assert
        Assert.True(root.TryGetProperty("token", out _));
        Assert.True(root.TryGetProperty("expiresAt", out _));
        Assert.False(root.TryGetProperty("refreshToken", out _));
        Assert.False(root.TryGetProperty("RefreshToken", out _));

        // Also assert without camelCase options
        var pascalJson = JsonSerializer.Serialize(response);
        using var pascalDoc = JsonDocument.Parse(pascalJson);
        Assert.True(pascalDoc.RootElement.TryGetProperty("Token", out _));
        Assert.False(pascalDoc.RootElement.TryGetProperty("RefreshToken", out _));
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginIsAllowed_ExecutesAction()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext("http://localhost:5173", ["http://localhost:5173"]);
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.True(nextCalled);
        Assert.Null(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginIsUntrusted_ReturnsForbidResult()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext("http://evil-attacker.com", ["http://localhost:5173"]);
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.False(nextCalled);
        Assert.IsType<ForbidResult>(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginAndRefererMissing_ReturnsForbidResult()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext(null, ["http://localhost:5173"]);
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.False(nextCalled);
        Assert.IsType<ForbidResult>(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginMissingButTrustedRefererPresent_ExecutesAction()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext(null, ["http://localhost:5173"], referer: "http://localhost:5173/activities");
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.True(nextCalled);
        Assert.Null(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginIsAllowedAndSecFetchSiteIsCrossSite_ExecutesAction()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext("http://localhost:5173", ["http://localhost:5173"]);
        context.HttpContext.Request.Headers["Sec-Fetch-Site"] = "cross-site";
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.True(nextCalled);
        Assert.Null(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginIsUntrustedAndSecFetchSiteIsCrossSite_ReturnsForbidResult()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext("https://evil-attacker.com", ["http://localhost:5173"]);
        context.HttpContext.Request.Headers["Sec-Fetch-Site"] = "cross-site";
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.False(nextCalled);
        Assert.IsType<ForbidResult>(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginMissingAndSecFetchSiteIsCrossSiteWithTrustedReferer_ReturnsForbidResult()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext(null, ["http://localhost:5173"], referer: "http://localhost:5173/activities");
        context.HttpContext.Request.Headers["Sec-Fetch-Site"] = "cross-site";
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.False(nextCalled);
        Assert.IsType<ForbidResult>(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginMissingAndRefererIsUntrusted_ReturnsForbidResult()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext(null, ["http://localhost:5173"], referer: "https://evil-attacker.com/activities");
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.False(nextCalled);
        Assert.IsType<ForbidResult>(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenSecFetchSiteIsSameOrigin_ExecutesAction()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext("http://localhost:5173", ["http://localhost:5173"]);
        context.HttpContext.Request.Headers["Sec-Fetch-Site"] = "same-origin";
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.True(nextCalled);
        Assert.Null(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginIsInvalidFormat_ReturnsForbidResult()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext("http://localhost:5173/unexpected-path", ["http://localhost:5173"]);
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.False(nextCalled);
        Assert.IsType<ForbidResult>(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginIsNullString_ReturnsForbidResult()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext("null", ["http://localhost:5173"]);
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.False(nextCalled);
        Assert.IsType<ForbidResult>(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginHasDeceptiveSuffix_ReturnsForbidResult()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext("http://localhost:5173.evil.com", ["http://localhost:5173"]);
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.False(nextCalled);
        Assert.IsType<ForbidResult>(context.Result);
    }

    [Fact]
    public async Task ValidateOrigin_WhenOriginPortDiffers_ReturnsForbidResult()
    {
        // Arrange
        var filter = new ValidateOriginAttribute();
        var context = CreateActionExecutingContext("http://localhost:5174", ["http://localhost:5173"]);
        var nextCalled = false;

        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(context, next);

        // Assert
        Assert.False(nextCalled);
        Assert.IsType<ForbidResult>(context.Result);
    }

    private static ActionExecutingContext CreateActionExecutingContext(
        string? origin,
        string[] allowedOrigins,
        string? referer = null)
    {
        var inMemorySettings = new Dictionary<string, string?>();
        for (var i = 0; i < allowedOrigins.Length; i++)
        {
            inMemorySettings[$"Cors:AllowedOrigins:{i}"] = allowedOrigins[i];
        }

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var services = new ServiceCollection();
        services.AddSingleton(configuration);
        var serviceProvider = services.BuildServiceProvider();

        var httpContext = new DefaultHttpContext
        {
            RequestServices = serviceProvider
        };

        if (origin != null)
        {
            httpContext.Request.Headers.Origin = origin;
        }

        if (referer != null)
        {
            httpContext.Request.Headers.Referer = referer;
        }

        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor()
        );

        return new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            new object()
        );
    }
}
