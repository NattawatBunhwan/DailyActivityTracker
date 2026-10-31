using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Features.Users.DTOs;
using DailyActivityTracker.Application.Features.Users.Services;
using DailyActivityTracker.Application.Interfaces.Repositories;
using DailyActivityTracker.Domain.Common;
using DailyActivityTracker.Domain.Entities;
using Moq;

namespace DailyActivityTracker.Tests;

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly UserService _userService;

    public UserServiceTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _userService = new UserService(_userRepositoryMock.Object);
    }

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WhenEmailDoesNotExist_HashesPasswordAndCreatesUser()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Email = "  User@Example.COM  ",
            Password = "SecurePassword123!",
            FirstName = "John",
            LastName = "Doe",
            Age = 30,
            Occupation = "Engineer"
        };

        _userRepositoryMock
            .Setup(repo => repo.GetByEmailAsync("user@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        User? capturedUser = null;
        _userRepositoryMock
            .Setup(repo => repo.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((u, _) =>
            {
                capturedUser = u;
                u.Id = Guid.NewGuid();
            })
            .Returns(Task.CompletedTask);

        // Act
        var result = await _userService.CreateAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("John", result.FirstName);
        Assert.Equal("Doe", result.LastName);
        Assert.Equal(30, result.Age);
        Assert.Equal("Engineer", result.Occupation);

        Assert.NotNull(capturedUser);
        Assert.Equal("user@example.com", capturedUser.Email);
        Assert.Equal(Roles.User, capturedUser.Role);
        Assert.True(BCrypt.Net.BCrypt.Verify("SecurePassword123!", capturedUser.PasswordHash));

        _userRepositoryMock.Verify(repo => repo.GetByEmailAsync("user@example.com", It.IsAny<CancellationToken>()), Times.Once);
        _userRepositoryMock.Verify(repo => repo.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_WhenEmailAlreadyExists_ThrowsEmailAlreadyExistsException()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Email = "existing@example.com",
            Password = "Password123!",
            FirstName = "Jane",
            LastName = "Doe"
        };

        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "existing@example.com"
        };

        _userRepositoryMock
            .Setup(repo => repo.GetByEmailAsync("existing@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingUser);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<EmailAlreadyExistsException>(() => _userService.CreateAsync(request));
        Assert.Contains("existing@example.com", ex.Message);

        _userRepositoryMock.Verify(repo => repo.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region GetAllAsync Tests

    [Fact]
    public async Task GetAllAsync_WhenUsersExist_ReturnsMappedUserResponseList()
    {
        // Arrange
        var users = new List<User>
        {
            new()
            {
                Id = Guid.NewGuid(),
                FirstName = "Alice",
                LastName = "Smith",
                Age = 25,
                Occupation = "Designer"
            },
            new()
            {
                Id = Guid.NewGuid(),
                FirstName = "Bob",
                LastName = "Jones",
                Age = 35,
                Occupation = "Manager"
            }
        };

        _userRepositoryMock
            .Setup(repo => repo.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(users);

        // Act
        var result = await _userService.GetAllAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Equal("Alice", result[0].FirstName);
        Assert.Equal("Bob", result[1].FirstName);

        _userRepositoryMock.Verify(repo => repo.GetAllAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetAllAsync_WhenNoUsersExist_ReturnsEmptyList()
    {
        // Arrange
        _userRepositoryMock
            .Setup(repo => repo.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<User>());

        // Act
        var result = await _userService.GetAllAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenUserExistsAndBelongsToCurrentUser_ReturnsUserResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var currentUserId = userId; // Same user

        var user = new User
        {
            Id = userId,
            FirstName = "Charlie",
            LastName = "Brown",
            Age = 28,
            Occupation = "Writer"
        };

        _userRepositoryMock
            .Setup(repo => repo.GetByIdAndUserIdAsync(userId, currentUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        // Act
        var result = await _userService.GetByIdAsync(userId, currentUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result.Id);
        Assert.Equal("Charlie", result.FirstName);
        Assert.Equal("Brown", result.LastName);
        Assert.Equal(28, result.Age);
        Assert.Equal("Writer", result.Occupation);

        _userRepositoryMock.Verify(repo => repo.GetByIdAndUserIdAsync(userId, currentUserId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetByIdAsync_WhenUserDoesNotExistOrBelongsToDifferentUser_ThrowsUserNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        _userRepositoryMock
            .Setup(repo => repo.GetByIdAndUserIdAsync(userId, otherUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        // Act & Assert
        await Assert.ThrowsAsync<UserNotFoundException>(() => _userService.GetByIdAsync(userId, otherUserId));

        _userRepositoryMock.Verify(repo => repo.GetByIdAndUserIdAsync(userId, otherUserId, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WhenUserExistsAndBelongsToCurrentUser_UpdatesFieldsAndReturnsResponse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var currentUserId = userId;

        var existingUser = new User
        {
            Id = userId,
            FirstName = "OldFirst",
            LastName = "OldLast",
            Age = 20,
            Occupation = "Student"
        };

        var request = new UpdateUserRequest
        {
            FirstName = "NewFirst",
            LastName = "NewLast",
            Age = 21,
            Occupation = "Graduate"
        };

        _userRepositoryMock
            .Setup(repo => repo.GetByIdAndUserIdAsync(userId, currentUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingUser);

        // Act
        var result = await _userService.UpdateAsync(userId, currentUserId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("NewFirst", result.FirstName);
        Assert.Equal("NewLast", result.LastName);
        Assert.Equal(21, result.Age);
        Assert.Equal("Graduate", result.Occupation);

        Assert.Equal("NewFirst", existingUser.FirstName);
        Assert.Equal("NewLast", existingUser.LastName);
        Assert.Equal(21, existingUser.Age);
        Assert.Equal("Graduate", existingUser.Occupation);

        _userRepositoryMock.Verify(repo => repo.UpdateAsync(existingUser, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_WhenUserDoesNotExistOrBelongsToDifferentUser_ThrowsUserNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        var request = new UpdateUserRequest
        {
            FirstName = "First",
            LastName = "Last"
        };

        _userRepositoryMock
            .Setup(repo => repo.GetByIdAndUserIdAsync(userId, otherUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        // Act & Assert
        await Assert.ThrowsAsync<UserNotFoundException>(() => _userService.UpdateAsync(userId, otherUserId, request));

        _userRepositoryMock.Verify(repo => repo.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WhenUserExistsAndBelongsToCurrentUser_DeletesUserAndReturnsTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var currentUserId = userId;

        var existingUser = new User
        {
            Id = userId,
            FirstName = "Dave",
            LastName = "Miller"
        };

        _userRepositoryMock
            .Setup(repo => repo.GetByIdAndUserIdAsync(userId, currentUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingUser);

        // Act
        var result = await _userService.DeleteAsync(userId, currentUserId);

        // Assert
        Assert.True(result);
        _userRepositoryMock.Verify(repo => repo.DeleteAsync(existingUser, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_WhenUserDoesNotExistOrBelongsToDifferentUser_ThrowsUserNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        _userRepositoryMock
            .Setup(repo => repo.GetByIdAndUserIdAsync(userId, otherUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        // Act & Assert
        await Assert.ThrowsAsync<UserNotFoundException>(() => _userService.DeleteAsync(userId, otherUserId));

        _userRepositoryMock.Verify(repo => repo.DeleteAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion
}

