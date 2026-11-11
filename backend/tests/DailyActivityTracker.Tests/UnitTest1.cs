using DailyActivityTracker.Infrastructure.Persistence.Repositories;
using DailyActivityTracker.Application.Features.Activities.Validators;
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
        Assert.Equal(request.ActivityDate, result.ActivityDate);

        activityRepository.Verify(
            repo => repo.AddAsync(
                It.Is<Activity>(activity =>
                    activity.UserId == userId &&
                    activity.Title == request.Title &&
                    activity.Description == request.Description &&
                    activity.ActivityDate == request.ActivityDate &&
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
        Assert.Equal(1, result.Activities.Page);
        Assert.Equal(10, result.Activities.PageSize);
        Assert.Equal(2, result.Activities.TotalCount);
        Assert.Equal(1, result.Activities.TotalPages);
        Assert.Equal(2, result.Activities.Items.Count);
        Assert.Equal("Read a book", result.Activities.Items[0].Title);
        Assert.Equal("Go for a walk", result.Activities.Items[1].Title);
    }

    [Fact]
    public async Task GetAllAsync_WhenNoActivitiesFound_ReturnsZeroTotalPagesAndEmptyItems()
    {
        // Arrange
        var userId = Guid.NewGuid();
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
            .ReturnsAsync(new List<Activity>());

        activityRepository
            .Setup(repo => repo.CountByUserIdAsync(
                userId,
                query,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        var userRepository = new Mock<IUserRepository>();

        var service = new ActivityService(
            activityRepository.Object,
            userRepository.Object);

        // Act
        var result = await service.GetAllAsync(userId, query);

        // Assert
        Assert.Equal(1, result.Activities.Page);
        Assert.Equal(10, result.Activities.PageSize);
        Assert.Equal(0, result.Activities.TotalCount);
        Assert.Equal(0, result.Activities.TotalPages);
        Assert.Empty(result.Activities.Items);
    }

public class ActivityValidatorTests
{
    private readonly CreateActivityRequestValidator _createValidator = new();
    private readonly UpdateActivityRequestValidator _updateValidator = new();

    [Fact]
    public void CreateActivityRequestValidator_WhenTitleIs100Characters_ShouldBeValid()
    {
        var request = new CreateActivityRequest
        {
            Title = new string('a', 100),
            Description = "Test description",
            ActivityDate = DateTime.UtcNow,
            Status = ActivityStatus.Pending,
            Priority = ActivityPriority.Low
        };

        var result = _createValidator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void CreateActivityRequestValidator_WhenTitleIs101Characters_ShouldBeInvalid()
    {
        var request = new CreateActivityRequest
        {
            Title = new string('a', 101),
            Description = "Test description",
            ActivityDate = DateTime.UtcNow,
            Status = ActivityStatus.Pending,
            Priority = ActivityPriority.Low
        };

        var result = _createValidator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateActivityRequest.Title));
    }

    [Fact]
    public void UpdateActivityRequestValidator_WhenTitleIs100Characters_ShouldBeValid()
    {
        var request = new UpdateActivityRequest
        {
            Title = new string('a', 100),
            Description = "Test description",
            ActivityDate = DateTime.UtcNow,
            Status = ActivityStatus.Pending,
            Priority = ActivityPriority.Low
        };

        var result = _updateValidator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void UpdateActivityRequestValidator_WhenTitleIs101Characters_ShouldBeInvalid()
    {
        var request = new UpdateActivityRequest
        {
            Title = new string('a', 101),
            Description = "Test description",
            ActivityDate = DateTime.UtcNow,
            Status = ActivityStatus.Pending,
            Priority = ActivityPriority.Low
        };

        var result = _updateValidator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(UpdateActivityRequest.Title));
    }

    [Theory]
    [InlineData(ActivityStatus.Pending)]
    [InlineData(ActivityStatus.InProgress)]
    [InlineData(ActivityStatus.Completed)]
    [InlineData(ActivityStatus.Cancelled)]
    public void CreateActivityRequestValidator_WhenStatusIsValidEnum_ShouldBeValid(ActivityStatus status)
    {
        var request = new CreateActivityRequest
        {
            Title = "Valid Title",
            ActivityDate = DateTime.UtcNow,
            Status = status,
            Priority = ActivityPriority.Medium
        };

        var result = _createValidator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData((ActivityStatus)0)]
    [InlineData((ActivityStatus)99)]
    public void CreateActivityRequestValidator_WhenStatusIsUndefinedEnum_ShouldBeInvalid(ActivityStatus status)
    {
        var request = new CreateActivityRequest
        {
            Title = "Valid Title",
            ActivityDate = DateTime.UtcNow,
            Status = status,
            Priority = ActivityPriority.Medium
        };

        var result = _createValidator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateActivityRequest.Status));
    }

    [Theory]
    [InlineData(ActivityPriority.Low)]
    [InlineData(ActivityPriority.Medium)]
    [InlineData(ActivityPriority.High)]
    public void CreateActivityRequestValidator_WhenPriorityIsValidEnum_ShouldBeValid(ActivityPriority priority)
    {
        var request = new CreateActivityRequest
        {
            Title = "Valid Title",
            ActivityDate = DateTime.UtcNow,
            Status = ActivityStatus.Pending,
            Priority = priority
        };

        var result = _createValidator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData((ActivityPriority)0)]
    [InlineData((ActivityPriority)99)]
    public void CreateActivityRequestValidator_WhenPriorityIsUndefinedEnum_ShouldBeInvalid(ActivityPriority priority)
    {
        var request = new CreateActivityRequest
        {
            Title = "Valid Title",
            ActivityDate = DateTime.UtcNow,
            Status = ActivityStatus.Pending,
            Priority = priority
        };

        var result = _createValidator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateActivityRequest.Priority));
    }

    [Theory]
    [InlineData(ActivityStatus.Pending)]
    [InlineData(ActivityStatus.InProgress)]
    [InlineData(ActivityStatus.Completed)]
    [InlineData(ActivityStatus.Cancelled)]
    public void UpdateActivityRequestValidator_WhenStatusIsValidEnum_ShouldBeValid(ActivityStatus status)
    {
        var request = new UpdateActivityRequest
        {
            Title = "Valid Title",
            ActivityDate = DateTime.UtcNow,
            Status = status,
            Priority = ActivityPriority.Medium
        };

        var result = _updateValidator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData((ActivityStatus)0)]
    [InlineData((ActivityStatus)99)]
    public void UpdateActivityRequestValidator_WhenStatusIsUndefinedEnum_ShouldBeInvalid(ActivityStatus status)
    {
        var request = new UpdateActivityRequest
        {
            Title = "Valid Title",
            ActivityDate = DateTime.UtcNow,
            Status = status,
            Priority = ActivityPriority.Medium
        };

        var result = _updateValidator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(UpdateActivityRequest.Status));
    }

    [Theory]
    [InlineData(ActivityPriority.Low)]
    [InlineData(ActivityPriority.Medium)]
    [InlineData(ActivityPriority.High)]
    public void UpdateActivityRequestValidator_WhenPriorityIsValidEnum_ShouldBeValid(ActivityPriority priority)
    {
        var request = new UpdateActivityRequest
        {
            Title = "Valid Title",
            ActivityDate = DateTime.UtcNow,
            Status = ActivityStatus.Pending,
            Priority = priority
        };

        var result = _updateValidator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData((ActivityPriority)0)]
    [InlineData((ActivityPriority)99)]
    public void UpdateActivityRequestValidator_WhenPriorityIsUndefinedEnum_ShouldBeInvalid(ActivityPriority priority)
    {
        var request = new UpdateActivityRequest
        {
            Title = "Valid Title",
            ActivityDate = DateTime.UtcNow,
            Status = ActivityStatus.Pending,
            Priority = priority
        };

        var result = _updateValidator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(UpdateActivityRequest.Priority));
    }
}

public class ActivityRepositorySearchEscapingTests
{
    [Theory]
    [InlineData("ordinary text", "ordinary text")]
    [InlineData("running 10k", "running 10k")]
    [InlineData("Clean Code", "Clean Code")]
    public void EscapeLikePattern_WhenInputIsOrdinaryText_ReturnsUnchanged(string input, string expected)
    {
        var result = ActivityRepository.EscapeLikePattern(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("50%", "50\\%")]
    [InlineData("100% complete", "100\\% complete")]
    [InlineData("%leading", "\\%leading")]
    [InlineData("double%%percent", "double\\%\\%percent")]
    public void EscapeLikePattern_WhenInputContainsPercent_EscapesPercentSign(string input, string expected)
    {
        var result = ActivityRepository.EscapeLikePattern(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("user_name", "user\\_name")]
    [InlineData("Work_Log", "Work\\_Log")]
    [InlineData("_prefix", "\\_prefix")]
    [InlineData("a_b_c", "a\\_b\\_c")]
    public void EscapeLikePattern_WhenInputContainsUnderscore_EscapesUnderscore(string input, string expected)
    {
        var result = ActivityRepository.EscapeLikePattern(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("folder\\file", "folder\\\\file")]
    [InlineData("C:\\Users\\test", "C:\\\\Users\\\\test")]
    [InlineData("multiple\\\\backslashes", "multiple\\\\\\\\backslashes")]
    public void EscapeLikePattern_WhenInputContainsBackslash_EscapesBackslash(string input, string expected)
    {
        var result = ActivityRepository.EscapeLikePattern(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("search\\", "search\\\\")]
    [InlineData("\\", "\\\\")]
    [InlineData("path\\to\\", "path\\\\to\\\\")]
    public void EscapeLikePattern_WhenInputEndsWithBackslash_EscapesTrailingBackslash(string input, string expected)
    {
        var result = ActivityRepository.EscapeLikePattern(input);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void EscapeLikePattern_WhenInputContainsMixedSpecialCharacters_EscapesInCorrectOrder()
    {
        var input = "100%_done\\task";
        var expected = "100\\%\\_done\\\\task";

        var result = ActivityRepository.EscapeLikePattern(input);

        Assert.Equal(expected, result);
    }
}
}