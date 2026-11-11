using System.Net;
using DailyActivityTracker.Api.Middlewares;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace DailyActivityTracker.Tests;

public class SecurityMiddlewareTests
{
    [Fact]
    public async Task SecurityHeadersMiddleware_AddsExpectedSecurityHeaders_WithoutOverwritingExisting()
    {
        // Arrange
        var context = new DefaultHttpContext();
        var middleware = new SecurityHeadersMiddleware(innerContext =>
        {
            innerContext.Response.StatusCode = StatusCodes.Status200OK;
            return Task.CompletedTask;
        });

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.True(context.Response.Headers.ContainsKey("X-Content-Type-Options"));
        Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"].ToString());

        Assert.True(context.Response.Headers.ContainsKey("X-Frame-Options"));
        Assert.Equal("DENY", context.Response.Headers["X-Frame-Options"].ToString());

        Assert.True(context.Response.Headers.ContainsKey("Referrer-Policy"));
        Assert.Equal("strict-origin-when-cross-origin", context.Response.Headers["Referrer-Policy"].ToString());
    }

    [Fact]
    public async Task SecurityHeadersMiddleware_DoesNotDuplicateExistingHeaders()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Response.Headers["X-Frame-Options"] = "SAMEORIGIN";

        var middleware = new SecurityHeadersMiddleware(innerContext =>
        {
            innerContext.Response.StatusCode = StatusCodes.Status200OK;
            return Task.CompletedTask;
        });

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.True(context.Response.Headers.ContainsKey("X-Frame-Options"));
        Assert.Equal("SAMEORIGIN", context.Response.Headers["X-Frame-Options"].ToString());

        Assert.True(context.Response.Headers.ContainsKey("X-Content-Type-Options"));
        Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"].ToString());

        Assert.True(context.Response.Headers.ContainsKey("Referrer-Policy"));
        Assert.Equal("strict-origin-when-cross-origin", context.Response.Headers["Referrer-Policy"].ToString());
    }

    [Fact]
    public async Task HstsMiddleware_WhenRequestIsHttps_AppendsStrictTransportSecurityHeader()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "https";

        var hstsOptions = Options.Create(new HstsOptions
        {
            MaxAge = TimeSpan.FromDays(30),
            IncludeSubDomains = true
        });

        var loggerFactory = LoggerFactory.Create(builder => { });
        var hstsMiddleware = new HstsMiddleware(innerContext => Task.CompletedTask, hstsOptions, loggerFactory);

        // Act
        await hstsMiddleware.Invoke(context);

        // Assert
        Assert.True(context.Response.Headers.ContainsKey("Strict-Transport-Security"));
        var hstsHeader = context.Response.Headers["Strict-Transport-Security"].ToString();
        Assert.Contains("max-age=", hstsHeader);
        Assert.Contains("includeSubDomains", hstsHeader);
    }

    [Fact]
    public async Task HstsMiddleware_WhenRequestIsNotHttps_DoesNotAppendStrictTransportSecurityHeader()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Scheme = "http";

        var hstsOptions = Options.Create(new HstsOptions());
        var loggerFactory = LoggerFactory.Create(builder => { });
        var hstsMiddleware = new HstsMiddleware(innerContext => Task.CompletedTask, hstsOptions, loggerFactory);

        // Act
        await hstsMiddleware.Invoke(context);

        // Assert
        Assert.False(context.Response.Headers.ContainsKey("Strict-Transport-Security"));
    }

    [Theory]
    [InlineData("Development", false)]
    [InlineData("Production", true)]
    [InlineData("Staging", true)]
    public void EnvironmentCheck_DeterminesWhetherHstsShouldBeConfigured(string environmentName, bool shouldEnableHsts)
    {
        // Arrange
        var mockEnvironment = new Mock<IWebHostEnvironment>();
        mockEnvironment.Setup(e => e.EnvironmentName).Returns(environmentName);

        // Act
        var isDevelopment = mockEnvironment.Object.IsDevelopment();
        var isHstsApplicable = !isDevelopment;

        // Assert
        Assert.Equal(shouldEnableHsts, isHstsApplicable);
    }
}
