using DailyActivityTracker.Api.Controllers;
using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Features.Users.DTOs;
using DailyActivityTracker.Application.Features.Users.Services;
using DailyActivityTracker.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DailyActivityTracker.Tests;

public class UsersControllerTests
{
    private readonly Mock<IUserService> _userServiceMock;
    private readonly Mock<ICurrentUserService> _currentUserServiceMock;
    private readonly UsersController _controller;

    public UsersControllerTests()
    {
        _userServiceMock = new Mock<IUserService>();
        _currentUserServiceMock = new Mock<ICurrentUserService>();
        _controller = new UsersController(_userServiceMock.Object, _currentUserServiceMock.Object);
    }

    #region Endpoint Logic & Response Tests

    [Fact]
    public async Task Create_WhenSuccessful_ReturnsCreatedAtActionWithUser()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Email = "newuser@example.com",
            Password = "Password123!",
            FirstName = "Alice",
            LastName = "Smith"
        };

        var createdUser = new UserResponse
        {
            Id = Guid.NewGuid(),
            FirstName = "Alice",
            LastName = "Smith"
        };

        _userServiceMock
            .Setup(s => s.CreateAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdUser);

        // Act
        var result = await _controller.Create(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(UsersController.GetById), createdResult.ActionName);
        Assert.Equal(createdUser, createdResult.Value);
    }

    [Fact]
    public async Task Create_WhenEmailAlreadyExists_PropagatesEmailAlreadyExistsException()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Email = "duplicate@example.com",
            Password = "Password123!"
        };

        _userServiceMock
            .Setup(s => s.CreateAsync(request, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new EmailAlreadyExistsException("duplicate@example.com"));

        // Act & Assert
        await Assert.ThrowsAsync<EmailAlreadyExistsException>(() => _controller.Create(request));
    }

    [Fact]
    public async Task GetAll_WhenCalled_ReturnsOkWithUsersList()
    {
        // Arrange
        var users = new List<UserResponse>
        {
            new() { Id = Guid.NewGuid(), FirstName = "User1" },
            new() { Id = Guid.NewGuid(), FirstName = "User2" }
        };

        _userServiceMock
            .Setup(s => s.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(users);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(users, okResult.Value);
    }

    [Fact]
    public async Task GetById_WhenUserExistsAndAuthorized_ReturnsOkWithUser()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var targetUserId = currentUserId;

        var user = new UserResponse
        {
            Id = targetUserId,
            FirstName = "Current",
            LastName = "User"
        };

        _currentUserServiceMock.Setup(s => s.UserId).Returns(currentUserId);
        _userServiceMock
            .Setup(s => s.GetByIdAsync(targetUserId, currentUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        // Act
        var result = await _controller.GetById(targetUserId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(user, okResult.Value);
    }

    [Fact]
    public async Task GetById_WhenAccessingOtherUser_PropagatesUserNotFoundException()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        _currentUserServiceMock.Setup(s => s.UserId).Returns(currentUserId);
        _userServiceMock
            .Setup(s => s.GetByIdAsync(otherUserId, currentUserId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UserNotFoundException(otherUserId));

        // Act & Assert
        await Assert.ThrowsAsync<UserNotFoundException>(() => _controller.GetById(otherUserId));
    }

    [Fact]
    public async Task Update_WhenUserExistsAndAuthorized_ReturnsOkWithUpdatedUser()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var targetUserId = currentUserId;

        var request = new UpdateUserRequest
        {
            FirstName = "UpdatedFirst",
            LastName = "UpdatedLast",
            Age = 32
        };

        var updatedUser = new UserResponse
        {
            Id = targetUserId,
            FirstName = "UpdatedFirst",
            LastName = "UpdatedLast",
            Age = 32
        };

        _currentUserServiceMock.Setup(s => s.UserId).Returns(currentUserId);
        _userServiceMock
            .Setup(s => s.UpdateAsync(targetUserId, currentUserId, request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(updatedUser);

        // Act
        var result = await _controller.Update(targetUserId, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(updatedUser, okResult.Value);
    }

    [Fact]
    public async Task Update_WhenServiceReturnsNull_ReturnsNotFound()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var targetUserId = currentUserId;
        var request = new UpdateUserRequest { FirstName = "Any" };

        _currentUserServiceMock.Setup(s => s.UserId).Returns(currentUserId);
        _userServiceMock
            .Setup(s => s.UpdateAsync(targetUserId, currentUserId, request, It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserResponse?)null);

        // Act
        var result = await _controller.Update(targetUserId, request);

        // Assert
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Delete_WhenDeleteSucceeds_ReturnsNoContent()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var targetUserId = currentUserId;

        _currentUserServiceMock.Setup(s => s.UserId).Returns(currentUserId);
        _userServiceMock
            .Setup(s => s.DeleteAsync(targetUserId, currentUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.Delete(targetUserId);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_WhenDeleteReturnsFalse_ReturnsNotFound()
    {
        // Arrange
        var currentUserId = Guid.NewGuid();
        var targetUserId = currentUserId;

        _currentUserServiceMock.Setup(s => s.UserId).Returns(currentUserId);
        _userServiceMock
            .Setup(s => s.DeleteAsync(targetUserId, currentUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.Delete(targetUserId);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    #endregion

    #region Authorization Attribute Reflection Checks

    [Fact]
    public void UsersController_HasClassLevelAuthorizeAttribute()
    {
        var classAuth = typeof(UsersController).GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true);
        Assert.NotEmpty(classAuth);
    }

    [Fact]
    public void Create_HasAllowAnonymousAttribute()
    {
        var method = typeof(UsersController).GetMethod(nameof(UsersController.Create));
        Assert.NotNull(method);
        var allowAnon = method.GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: false);
        Assert.NotEmpty(allowAnon);
    }

    [Fact]
    public void GetAll_HasAuthorizeAttributeWithAdminOnlyPolicy()
    {
        var method = typeof(UsersController).GetMethod(nameof(UsersController.GetAll));
        Assert.NotNull(method);
        var authAttrs = method.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false).Cast<AuthorizeAttribute>();
        var adminAttr = authAttrs.FirstOrDefault(a => a.Policy == AuthorizationPolicies.AdminOnly);
        Assert.NotNull(adminAttr);
    }

    #endregion
}

