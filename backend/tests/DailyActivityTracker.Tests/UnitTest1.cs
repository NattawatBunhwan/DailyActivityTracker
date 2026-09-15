using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Features.Activities.DTOs;
using DailyActivityTracker.Application.Features.Activities.Services;
using DailyActivityTracker.Application.Interfaces.Repositories;
using DailyActivityTracker.Domain.Entities;
using DailyActivityTracker.Domain.Enums;
using DailyActivityTracker.Application.Common;
using Moq;

namespace DailyActivityTracker.Tests;

public class ActivityServiceTests
{
    [Fact]
    public async Task GetByIdAsync_WhenActivityExists_ReturnsActivityResponse()
    {
        // Arrange: �������������� repository ���ͧ
        var activityId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var activity = new Activity
        {
            Id = activityId,
            UserId = userId,
            Title = "Read a book",
            Description = "Read for 30 minutes",
            ActivityDate = new DateTime(2026, 9, 16, 10, 0, 0, DateTimeKind.Utc),
            Status = ActivityStatus.InProgress,
            Priority = ActivityPriority.Medium
        };

        var activityRepository = new Mock<IActivityRepository>();
        activityRepository
            .Setup(repo => repo.GetByIdAndUserIdAsync(
                activityId,
                userId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(activity);

        var userRepository = new Mock<IUserRepository>();
        var service = new ActivityService(
            activityRepository.Object,
            userRepository.Object);

        // Act: ���¡���ʹ����ͧ��÷��ͺ
        var result = await service.GetByIdAsync(activityId, userId);

        // Assert: ��Ǩ���Ѿ��
        Assert.NotNull(result);
        Assert.Equal(activityId, result.Id);
        Assert.Equal(userId, result.UserId);
        Assert.Equal("Read a book", result.Title);
    }

    [Fact]
    public async Task GetByIdAsync_WhenActivityDoesNotExist_ReturnsNull()
    {
    // Arrange
    var activityId = Guid.NewGuid();
    var userId = Guid.NewGuid();

    var activityRepository = new Mock<IActivityRepository>();
    activityRepository
        .Setup(repo => repo.GetByIdAndUserIdAsync(
            activityId,
            userId,
            It.IsAny<CancellationToken>()))
        .ReturnsAsync((Activity?)null);

    var userRepository = new Mock<IUserRepository>();

    var service = new ActivityService(
        activityRepository.Object,
        userRepository.Object);

    // Act
    var result = await service.GetByIdAsync(activityId, userId);

    // Assert
    Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_WhenActivityDoesNotExist_ReturnsFalse()
    {
        // Arrange
        var activityId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var activityRepository = new Mock<IActivityRepository>();
        activityRepository
            .Setup(repo => repo.GetByIdAndUserIdAsync(
                activityId,
                userId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((Activity?)null);

        var userRepository = new Mock<IUserRepository>();

        var service = new ActivityService(
            activityRepository.Object,
            userRepository.Object);

        // Act
        var result = await service.DeleteAsync(activityId, userId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteAsync_WhenActivityExists_ReturnsTrue()
    {
        // Arrange
        var activityId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var activity = new Activity
        {
            Id = activityId,
            UserId = userId,
            Title = "Read a book"
        };

        var activityRepository = new Mock<IActivityRepository>();
        activityRepository
            .Setup(repo => repo.GetByIdAndUserIdAsync(
                activityId,
                userId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(activity);

        var userRepository = new Mock<IUserRepository>();

        var service = new ActivityService(
            activityRepository.Object,
            userRepository.Object);

        // Act
        var result = await service.DeleteAsync(activityId, userId);

        // Assert
        Assert.True(result);

        activityRepository.Verify(
            repo => repo.DeleteAsync(activity, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_WhenActivityDoesNotExist_ReturnsNull()
    {
        // Arrange
        var activityId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var request = new UpdateActivityRequest
        {
            Title = "Updated title",
            Description = "Updated description",
            ActivityDate = new DateTime(2026, 9, 16, 10, 0, 0, DateTimeKind.Utc),
            Status = ActivityStatus.InProgress,
            Priority = ActivityPriority.Medium
        };

        var activityRepository = new Mock<IActivityRepository>();
        activityRepository
            .Setup(repo => repo.GetByIdAndUserIdAsync(
                activityId,
                userId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((Activity?)null);

        var userRepository = new Mock<IUserRepository>();

        var service = new ActivityService(
            activityRepository.Object,
            userRepository.Object);

        // Act
        var result = await service.UpdateAsync(activityId, userId, request);

        // Assert
        Assert.Null(result);

        activityRepository.Verify(
            repo => repo.UpdateAsync(It.IsAny<Activity>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateAsync_WhenActivityExists_UpdatesActivityAndReturnsResponse()
    {
        // Arrange
        var activityId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var activity = new Activity
        {
            Id = activityId,
            UserId = userId,
            Title = "Old title",
            Description = "Old description",
            ActivityDate = new DateTime(2026, 9, 15, 10, 0, 0, DateTimeKind.Utc),
            Status = ActivityStatus.Pending,
            Priority = ActivityPriority.Low
        };

        var request = new UpdateActivityRequest
        {
            Title = "Updated title",
            Description = "Updated description",
            ActivityDate = new DateTime(2026, 9, 16, 10, 0, 0, DateTimeKind.Utc),
            Status = ActivityStatus.InProgress,
            Priority = ActivityPriority.Medium
        };

        var activityRepository = new Mock<IActivityRepository>();
        activityRepository
            .Setup(repo => repo.GetByIdAndUserIdAsync(
                activityId,
                userId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(activity);

        var userRepository = new Mock<IUserRepository>();

        var service = new ActivityService(
            activityRepository.Object,
            userRepository.Object);

        // Act
        var result = await service.UpdateAsync(activityId, userId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated title", result.Title);
        Assert.Equal("Updated description", result.Description);
        Assert.Equal(ActivityStatus.InProgress, result.Status);
        Assert.Equal(ActivityPriority.Medium, result.Priority);

        activityRepository.Verify(
            repo => repo.UpdateAsync(activity, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateAsync_WhenUserExists_CreatesActivityAndReturnsResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var user = new User
        {
            Id = userId
        };

        var request = new CreateActivityRequest
        {
            Title = "Read a book",
            Description = "Read for 30 minutes",
            ActivityDate = new DateTime(2026, 9, 16, 10, 0, 0, DateTimeKind.Utc),
            Status = ActivityStatus.InProgress,
            Priority = ActivityPriority.Medium
        };

        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(repo => repo.GetByIdAsync(
                userId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var activityRepository = new Mock<IActivityRepository>();

        var service = new ActivityService(
            activityRepository.Object,
            userRepository.Object);

        // Act
        var result = await service.CreateAsync(userId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result.UserId);
        Assert.Equal("Read a book", result.Title);
        Assert.Equal("Read for 30 minutes", result.Description);
        Assert.Equal(ActivityStatus.InProgress, result.Status);
        Assert.Equal(ActivityPriority.Medium, result.Priority);

        activityRepository.Verify(
            repo => repo.AddAsync(
                It.Is<Activity>(activity =>
                    activity.UserId == userId &&
                    activity.Title == request.Title &&
                    activity.Description == request.Description &&
                    activity.Status == request.Status &&
                    activity.Priority == request.Priority),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateAsync_WhenUserDoesNotExist_ThrowsUserNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var request = new CreateActivityRequest
        {
            Title = "Read a book",
            Description = "Read for 30 minutes",
            ActivityDate = new DateTime(2026, 9, 16, 10, 0, 0, DateTimeKind.Utc),
            Status = ActivityStatus.InProgress,
            Priority = ActivityPriority.Medium
        };

        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(repo => repo.GetByIdAsync(
                userId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var activityRepository = new Mock<IActivityRepository>();

        var service = new ActivityService(
            activityRepository.Object,
            userRepository.Object);

        // Act & Assert
        await Assert.ThrowsAsync<UserNotFoundException>(
            () => service.CreateAsync(userId, request));

        activityRepository.Verify(
            repo => repo.AddAsync(It.IsAny<Activity>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsPagedResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var activities = new List<Activity>
    {
        new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = "Read a book",
            ActivityDate = new DateTime(2026, 9, 16, 10, 0, 0, DateTimeKind.Utc),
            Status = ActivityStatus.InProgress,
            Priority = ActivityPriority.Medium
        },
        new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = "Go for a walk",
            ActivityDate = new DateTime(2026, 9, 16, 11, 0, 0, DateTimeKind.Utc),
            Status = ActivityStatus.Pending,
            Priority = ActivityPriority.Low
        }
    };

        var query = new ActivityQueryParameters
        {
            Page = 1,
            PageSize = 10
        };

        var activityRepository = new Mock<IActivityRepository>();
        activityRepository
            .Setup(repo => repo.GetAllByUserIdAsync(
                userId,
                query,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(activities);

        activityRepository
            .Setup(repo => repo.CountByUserIdAsync(
                userId,
                query,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);

        var userRepository = new Mock<IUserRepository>();

        var service = new ActivityService(
            activityRepository.Object,
            userRepository.Object);

        // Act
        var result = await service.GetAllAsync(userId, query);

        // Assert
        Assert.Equal(1, result.Page);
        Assert.Equal(10, result.PageSize);
        Assert.Equal(2, result.TotalCount);
        Assert.Equal(1, result.TotalPages);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal("Read a book", result.Items[0].Title);
        Assert.Equal("Go for a walk", result.Items[1].Title);
    }
}