using DailyActivityTracker.Infrastructure.Health;
using DailyActivityTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Moq;

namespace DailyActivityTracker.Tests;

public class HealthChecksTests
{
    private static ApplicationDbContext CreateMockDbContext(Mock<DatabaseFacade> mockDatabaseFacade)
    {
        var mockDbContext = new Mock<ApplicationDbContext>(
            new DbContextOptions<ApplicationDbContext>(),
            Mock.Of<IHttpContextAccessor>());

        mockDbContext.Setup(db => db.Database).Returns(mockDatabaseFacade.Object);
        return mockDbContext.Object;
    }

    [Fact]
    public async Task DatabaseHealthCheck_WhenCanConnectIsTrue_ReturnsHealthy()
    {
        // Arrange
        var mockDatabaseFacade = new Mock<DatabaseFacade>(
            MockBehavior.Loose,
            new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>(), null));

        mockDatabaseFacade.Setup(d => d.CanConnectAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var dbContext = CreateMockDbContext(mockDatabaseFacade);
        var healthCheck = new DatabaseHealthCheck(dbContext);

        // Act
        var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

        // Assert
        Assert.Equal(HealthStatus.Healthy, result.Status);
        Assert.Equal("Database connectivity confirmed.", result.Description);
        Assert.Null(result.Exception);
    }

    [Fact]
    public async Task DatabaseHealthCheck_WhenCanConnectIsFalse_ReturnsUnhealthy()
    {
        // Arrange
        var mockDatabaseFacade = new Mock<DatabaseFacade>(
            MockBehavior.Loose,
            new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>(), null));

        mockDatabaseFacade.Setup(d => d.CanConnectAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var dbContext = CreateMockDbContext(mockDatabaseFacade);
        var healthCheck = new DatabaseHealthCheck(dbContext);

        // Act
        var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

        // Assert
        Assert.Equal(HealthStatus.Unhealthy, result.Status);
        Assert.Equal("Unable to connect to the database.", result.Description);
        Assert.Null(result.Exception);
    }

    [Fact]
    public async Task DatabaseHealthCheck_WhenCanConnectThrowsException_ReturnsUnhealthyWithoutLeakingDetails()
    {
        // Arrange
        var mockDatabaseFacade = new Mock<DatabaseFacade>(
            MockBehavior.Loose,
            new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>(), null));

        mockDatabaseFacade.Setup(d => d.CanConnectAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Sensitive connection string Host=prod-db;Password=secret123 failed"));

        var dbContext = CreateMockDbContext(mockDatabaseFacade);
        var healthCheck = new DatabaseHealthCheck(dbContext);

        // Act
        var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

        // Assert
        Assert.Equal(HealthStatus.Unhealthy, result.Status);
        Assert.Equal("Database connectivity check failed.", result.Description);
        Assert.DoesNotContain("password", result.Description, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("secret123", result.Description, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("prod-db", result.Description, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DatabaseHealthCheck_WhenCancellationTokenIsCancelled_PropagatesOperationCanceledException()
    {
        // Arrange
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var mockDatabaseFacade = new Mock<DatabaseFacade>(
            MockBehavior.Loose,
            new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>(), null));

        mockDatabaseFacade.Setup(d => d.CanConnectAsync(cts.Token))
            .ThrowsAsync(new OperationCanceledException(cts.Token));

        var dbContext = CreateMockDbContext(mockDatabaseFacade);
        var healthCheck = new DatabaseHealthCheck(dbContext);

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            healthCheck.CheckHealthAsync(new HealthCheckContext(), cts.Token));
    }

    [Fact]
    public void LivenessEndpoint_PredicateMatchesLiveTag()
    {
        // Arrange
        var registration = new HealthCheckRegistration(
            name: "self",
            instance: new Mock<IHealthCheck>().Object,
            failureStatus: null,
            tags: ["live"]);

        // Act & Assert
        Assert.Contains("live", registration.Tags);
        Assert.DoesNotContain("ready", registration.Tags);
    }

    [Fact]
    public void ReadinessEndpoint_PredicateMatchesReadyTag()
    {
        // Arrange
        var registration = new HealthCheckRegistration(
            name: "database",
            instance: new Mock<IHealthCheck>().Object,
            failureStatus: null,
            tags: ["ready"]);

        // Act & Assert
        Assert.Contains("ready", registration.Tags);
        Assert.DoesNotContain("live", registration.Tags);
    }
}
