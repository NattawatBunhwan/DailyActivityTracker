using System.Security.Claims;
using DailyActivityTracker.Api.Controllers;
using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Application.DTOs.Audit;
using DailyActivityTracker.Application.Interfaces.Services;
using DailyActivityTracker.Domain.Common;
using DailyActivityTracker.Domain.Entities;
using DailyActivityTracker.Domain.Enums;
using DailyActivityTracker.Infrastructure.Persistence;
using DailyActivityTracker.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace DailyActivityTracker.Tests;

public class AdminAuditLogsControllerTests
{
    [Fact]
    public void AdminAuditLogsController_HasAuthorizeAttributeWithAdminOnlyPolicy()
    {
        // Assert: Authorization metadata checks
        var controllerType = typeof(AdminAuditLogsController);
        var authAttributes = controllerType.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        Assert.NotEmpty(authAttributes);
        var adminPolicyAttr = authAttributes.FirstOrDefault(a => a.Policy == AuthorizationPolicies.AdminOnly);
        Assert.NotNull(adminPolicyAttr);
        Assert.Equal(AuthorizationPolicies.AdminOnly, adminPolicyAttr.Policy);
    }

    [Fact]
    public async Task GetAuditLogs_WhenAdminAuthorized_CallsServiceAndReturnsOk()
    {
        // Arrange
        var mockService = new Mock<IAuditQueryService>();
        var query = new AuditLogQueryParameters { Page = 1, PageSize = 10 };
        var pagedResponse = new PagedResponse<AuditLogResponse>
        {
            Page = 1,
            PageSize = 10,
            TotalCount = 1,
            TotalPages = 1,
            Items =
            [
                new AuditLogResponse
                {
                    Id = Guid.NewGuid(),
                    TimestampUtc = DateTime.UtcNow,
                    Category = AuditCategory.Authentication,
                    Action = "LoginSucceeded",
                    ActorEmail = "admin@example.com",
                    ActorRole = Roles.Admin
                }
            ]
        };

        mockService
            .Setup(s => s.GetAuditLogsAsync(query, It.IsAny<CancellationToken>()))
            .ReturnsAsync(pagedResponse);

        var controller = new AdminAuditLogsController(mockService.Object);

        // Act
        var result = await controller.GetAuditLogs(query, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var responseValue = Assert.IsType<PagedResponse<AuditLogResponse>>(okResult.Value);
        Assert.Single(responseValue.Items);
        Assert.Equal("LoginSucceeded", responseValue.Items[0].Action);
        mockService.Verify(s => s.GetAuditLogsAsync(query, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetAuditLogs_PassesAllFilterParametersToService()
    {
        // Arrange
        var mockService = new Mock<IAuditQueryService>();
        var userId = Guid.NewGuid();
        var query = new AuditLogQueryParameters
        {
            Page = 2,
            PageSize = 50,
            Category = AuditCategory.Data,
            Action = "ActivityUpdated",
            UserId = userId,
            From = "2026-11-01",
            To = "2026-11-03"
        };

        mockService
            .Setup(s => s.GetAuditLogsAsync(query, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PagedResponse<AuditLogResponse>
            {
                Page = 2,
                PageSize = 50,
                TotalCount = 0,
                TotalPages = 0,
                Items = []
            });

        var controller = new AdminAuditLogsController(mockService.Object);

        // Act
        var result = await controller.GetAuditLogs(query, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<PagedResponse<AuditLogResponse>>(okResult.Value);
        Assert.Empty(response.Items);
        Assert.Equal(2, response.Page);
        Assert.Equal(50, response.PageSize);
        mockService.Verify(s => s.GetAuditLogsAsync(query, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetFilterOptions_WhenAdminAuthorized_CallsServiceAndReturnsOk()
    {
        // Arrange
        var mockService = new Mock<IAuditQueryService>();
        var filterOptions = new AuditFilterOptionsResponse
        {
            Actions = ["ActivityCreated", "LoginSucceeded"],
            Users =
            [
                new AuditUserOptionResponse
                {
                    UserId = Guid.NewGuid(),
                    Email = "admin@example.com",
                    DisplayName = "Admin User",
                    Role = Roles.Admin,
                    IsDeleted = false
                }
            ]
        };

        mockService
            .Setup(s => s.GetFilterOptionsAsync(It.IsAny<AuditFilterOptionsQueryParameters?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(filterOptions);

        var controller = new AdminAuditLogsController(mockService.Object);

        // Act
        var result = await controller.GetFilterOptions(new AuditFilterOptionsQueryParameters(), CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var responseValue = Assert.IsType<AuditFilterOptionsResponse>(okResult.Value);
        Assert.Equal(2, responseValue.Actions.Count);
        Assert.Single(responseValue.Users);
        mockService.Verify(s => s.GetFilterOptionsAsync(It.IsAny<AuditFilterOptionsQueryParameters?>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}

public class AuditQueryServiceLogicTests
{
    private static IQueryable<AuditLog> ApplyFiltersAndPagination(
        IQueryable<AuditLog> source,
        AuditLogQueryParameters query,
        out int totalCount,
        out int totalPages)
    {
        if (query.Category.HasValue)
        {
            source = source.Where(x => x.Category == query.Category.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            var trimmedAction = query.Action.Trim();
            source = source.Where(x => x.Action == trimmedAction);
        }

        if (query.UserId.HasValue)
        {
            source = source.Where(x => x.UserId == query.UserId.Value);
        }

        if (AuditLogQueryParameters.TryParseUtcBoundary(query.From, isUpperBound: false, out var fromUtc, out _, out _) &&
            fromUtc.HasValue)
        {
            source = source.Where(x => x.TimestampUtc >= fromUtc.Value);
        }

        if (AuditLogQueryParameters.TryParseUtcBoundary(query.To, isUpperBound: true, out var toUtc, out var isExclusiveTo, out _) &&
            toUtc.HasValue)
        {
            source = isExclusiveTo
                ? source.Where(x => x.TimestampUtc < toUtc.Value)
                : source.Where(x => x.TimestampUtc <= toUtc.Value);
        }

        totalCount = source.Count();
        totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize);

        return source
            .OrderByDescending(x => x.TimestampUtc)
            .ThenByDescending(x => x.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize);
    }

    [Fact]
    public void FilterAndPagination_DefaultPagination_ReturnsFirst20ItemsOrderedNewestFirst()
    {
        // Arrange
        var baseTime = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc);
        var logs = new List<AuditLog>();

        for (int i = 0; i < 25; i++)
        {
            logs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                TimestampUtc = baseTime.AddMinutes(i),
                Category = AuditCategory.Data,
                Action = $"Action_{i}"
            });
        }

        var query = new AuditLogQueryParameters(); // Default: page = 1, pageSize = 20

        // Act
        var result = ApplyFiltersAndPagination(logs.AsQueryable(), query, out var totalCount, out var totalPages).ToList();

        // Assert
        Assert.Equal(25, totalCount);
        Assert.Equal(2, totalPages);
        Assert.Equal(20, result.Count);
        Assert.Equal("Action_24", result[0].Action); // Newest first
        Assert.Equal("Action_5", result[19].Action);
    }

    [Fact]
    public void FilterAndPagination_DeterministicTieBreaking_WhenTimestampsAreEqual_OrdersByIdDescending()
    {
        // Arrange
        var sameTime = new DateTime(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc);
        var id1 = new Guid("11111111-1111-1111-1111-111111111111");
        var id2 = new Guid("22222222-2222-2222-2222-222222222222");
        var id3 = new Guid("33333333-3333-3333-3333-333333333333");

        var logs = new List<AuditLog>
        {
            new() { Id = id1, TimestampUtc = sameTime, Action = "A1" },
            new() { Id = id3, TimestampUtc = sameTime, Action = "A3" },
            new() { Id = id2, TimestampUtc = sameTime, Action = "A2" }
        };

        var queryPage1 = new AuditLogQueryParameters { Page = 1, PageSize = 2 };
        var queryPage2 = new AuditLogQueryParameters { Page = 2, PageSize = 2 };

        // Act
        var page1 = ApplyFiltersAndPagination(logs.AsQueryable(), queryPage1, out _, out _).ToList();
        var page2 = ApplyFiltersAndPagination(logs.AsQueryable(), queryPage2, out _, out _).ToList();

        // Assert: Deterministic descending order: id3, then id2, then id1
        Assert.Equal(2, page1.Count);
        Assert.Equal(id3, page1[0].Id);
        Assert.Equal(id2, page1[1].Id);

        Assert.Single(page2);
        Assert.Equal(id1, page2[0].Id);
    }

    [Fact]
    public void FilterAndPagination_CustomPagination_ReturnsRequestedPage()
    {
        // Arrange
        var baseTime = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc);
        var logs = new List<AuditLog>();

        for (int i = 0; i < 15; i++)
        {
            logs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                TimestampUtc = baseTime.AddMinutes(i),
                Category = AuditCategory.Data,
                Action = $"Item_{i}"
            });
        }

        var query = new AuditLogQueryParameters { Page = 2, PageSize = 5 };

        // Act
        var result = ApplyFiltersAndPagination(logs.AsQueryable(), query, out var totalCount, out var totalPages).ToList();

        // Assert
        Assert.Equal(15, totalCount);
        Assert.Equal(3, totalPages);
        Assert.Equal(5, result.Count);
        Assert.Equal("Item_9", result[0].Action);
        Assert.Equal("Item_5", result[4].Action);
    }

    [Fact]
    public void FilterAndPagination_WhenEmpty_ReturnsZeroTotalPagesAndEmptyItems()
    {
        // Arrange
        var logs = new List<AuditLog>();
        var query = new AuditLogQueryParameters();

        // Act
        var result = ApplyFiltersAndPagination(logs.AsQueryable(), query, out var totalCount, out var totalPages).ToList();

        // Assert
        Assert.Empty(result);
        Assert.Equal(0, totalCount);
        Assert.Equal(0, totalPages);
    }

    [Fact]
    public void FilterAndPagination_FilterByCategory_ReturnsOnlyMatchingCategory()
    {
        // Arrange
        var logs = new List<AuditLog>
        {
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Authentication, Action = "LoginSucceeded", TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Data, Action = "ActivityCreated", TimestampUtc = DateTime.UtcNow }
        };

        var authQuery = new AuditLogQueryParameters { Category = AuditCategory.Authentication };
        var dataQuery = new AuditLogQueryParameters { Category = AuditCategory.Data };

        // Act
        var authResult = ApplyFiltersAndPagination(logs.AsQueryable(), authQuery, out _, out _).ToList();
        var dataResult = ApplyFiltersAndPagination(logs.AsQueryable(), dataQuery, out _, out _).ToList();

        // Assert
        Assert.Single(authResult);
        Assert.Equal("LoginSucceeded", authResult[0].Action);

        Assert.Single(dataResult);
        Assert.Equal("ActivityCreated", dataResult[0].Action);
    }

    [Fact]
    public void FilterAndPagination_FilterByAction_ReturnsOnlyExactAction()
    {
        // Arrange
        var logs = new List<AuditLog>
        {
            new() { Id = Guid.NewGuid(), Action = "LoginFailed", Category = AuditCategory.Authentication, TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Action = "LoginSucceeded", Category = AuditCategory.Authentication, TimestampUtc = DateTime.UtcNow }
        };

        var query = new AuditLogQueryParameters { Action = "LoginFailed" };

        // Act
        var result = ApplyFiltersAndPagination(logs.AsQueryable(), query, out _, out _).ToList();

        // Assert
        Assert.Single(result);
        Assert.Equal("LoginFailed", result[0].Action);
    }

    [Fact]
    public void FilterAndPagination_FilterByUserId_ReturnsOnlyUserLogs()
    {
        // Arrange
        var targetUserId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        var logs = new List<AuditLog>
        {
            new() { Id = Guid.NewGuid(), UserId = targetUserId, Action = "UserAction", Category = AuditCategory.Data, TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), UserId = otherUserId, Action = "OtherAction", Category = AuditCategory.Data, TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), UserId = null, Action = "AnonymousAction", Category = AuditCategory.Authentication, TimestampUtc = DateTime.UtcNow }
        };

        var query = new AuditLogQueryParameters { UserId = targetUserId };

        // Act
        var result = ApplyFiltersAndPagination(logs.AsQueryable(), query, out _, out _).ToList();

        // Assert
        Assert.Single(result);
        Assert.Equal("UserAction", result[0].Action);
        Assert.Equal(targetUserId, result[0].UserId);
    }

    [Fact]
    public void FilterAndPagination_DateOnlyTo_IncludesEntireDayThroughExclusiveNextDayMidnight()
    {
        // Arrange
        var morning = new DateTime(2026, 11, 3, 9, 0, 0, DateTimeKind.Utc);
        var evening = new DateTime(2026, 11, 3, 23, 59, 59, DateTimeKind.Utc);
        var nextDayEarly = new DateTime(2026, 11, 4, 0, 0, 0, DateTimeKind.Utc);

        var logs = new List<AuditLog>
        {
            new() { Id = Guid.NewGuid(), TimestampUtc = morning, Action = "Morning" },
            new() { Id = Guid.NewGuid(), TimestampUtc = evening, Action = "Evening" },
            new() { Id = Guid.NewGuid(), TimestampUtc = nextDayEarly, Action = "NextDay" }
        };

        var query = new AuditLogQueryParameters
        {
            To = "2026-11-03"
        };

        // Act
        var result = ApplyFiltersAndPagination(logs.AsQueryable(), query, out _, out _).ToList();

        // Assert: Both morning and late evening of Nov 3 are included; Nov 4 00:00:00 is excluded
        Assert.Equal(2, result.Count);
        Assert.Contains(result, l => l.Action == "Morning");
        Assert.Contains(result, l => l.Action == "Evening");
        Assert.DoesNotContain(result, l => l.Action == "NextDay");
    }

    [Fact]
    public void FilterAndPagination_DateTimeTo_UsesInclusiveExactTimestamp()
    {
        // Arrange
        var exactMatch = new DateTime(2026, 11, 3, 14, 30, 0, DateTimeKind.Utc);
        var earlier = new DateTime(2026, 11, 3, 14, 29, 59, DateTimeKind.Utc);
        var later = new DateTime(2026, 11, 3, 14, 30, 1, DateTimeKind.Utc);

        var logs = new List<AuditLog>
        {
            new() { Id = Guid.NewGuid(), TimestampUtc = earlier, Action = "Earlier" },
            new() { Id = Guid.NewGuid(), TimestampUtc = exactMatch, Action = "ExactMatch" },
            new() { Id = Guid.NewGuid(), TimestampUtc = later, Action = "Later" }
        };

        var query = new AuditLogQueryParameters
        {
            To = "2026-11-03T14:30:00Z"
        };

        // Act
        var result = ApplyFiltersAndPagination(logs.AsQueryable(), query, out _, out _).ToList();

        // Assert: Earlier and ExactMatch are included; Later is excluded
        Assert.Equal(2, result.Count);
        Assert.Contains(result, l => l.Action == "Earlier");
        Assert.Contains(result, l => l.Action == "ExactMatch");
        Assert.DoesNotContain(result, l => l.Action == "Later");
    }

    [Fact]
    public void FilterAndPagination_From_IsInclusive()
    {
        // Arrange
        var exactFrom = new DateTime(2026, 11, 3, 10, 0, 0, DateTimeKind.Utc);
        var beforeFrom = new DateTime(2026, 11, 3, 9, 59, 59, DateTimeKind.Utc);

        var logs = new List<AuditLog>
        {
            new() { Id = Guid.NewGuid(), TimestampUtc = beforeFrom, Action = "Before" },
            new() { Id = Guid.NewGuid(), TimestampUtc = exactFrom, Action = "ExactFrom" }
        };

        var query = new AuditLogQueryParameters
        {
            From = "2026-11-03T10:00:00Z"
        };

        // Act
        var result = ApplyFiltersAndPagination(logs.AsQueryable(), query, out _, out _).ToList();

        // Assert
        Assert.Single(result);
        Assert.Equal("ExactFrom", result[0].Action);
    }

    [Fact]
    public void FilterAndPagination_DateOnlyFromAndTo_MatchesEntireDateSpan()
    {
        // Arrange
        var day1Early = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc);
        var day2Late = new DateTime(2026, 11, 2, 23, 59, 59, DateTimeKind.Utc);
        var day3Early = new DateTime(2026, 11, 3, 0, 0, 0, DateTimeKind.Utc);

        var logs = new List<AuditLog>
        {
            new() { Id = Guid.NewGuid(), TimestampUtc = day1Early, Action = "Day1" },
            new() { Id = Guid.NewGuid(), TimestampUtc = day2Late, Action = "Day2" },
            new() { Id = Guid.NewGuid(), TimestampUtc = day3Early, Action = "Day3" }
        };

        var query = new AuditLogQueryParameters
        {
            From = "2026-11-01",
            To = "2026-11-02"
        };

        // Act
        var result = ApplyFiltersAndPagination(logs.AsQueryable(), query, out _, out _).ToList();

        // Assert: Day1 and Day2 are included; Day3 is excluded
        Assert.Equal(2, result.Count);
        Assert.Contains(result, l => l.Action == "Day1");
        Assert.Contains(result, l => l.Action == "Day2");
        Assert.DoesNotContain(result, l => l.Action == "Day3");
    }

    [Fact]
    public void ResponseDto_DoesNotExposeCredentialData()
    {
        // Arrange
        var response = new AuditLogResponse
        {
            Id = Guid.NewGuid(),
            Action = "ActivityUpdated",
            Category = AuditCategory.Data,
            TimestampUtc = DateTime.UtcNow,
            OldValues = "{\"Title\":\"Old\"}",
            NewValues = "{\"Title\":\"New\"}",
            Metadata = "{\"reason\":\"UserUpdated\"}"
        };

        // Act
        var serialized = System.Text.Json.JsonSerializer.Serialize(response);

        // Assert
        Assert.DoesNotContain("Password", serialized, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("PasswordHash", serialized, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Token", serialized, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("RefreshToken", serialized, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Secret", serialized, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ApplyActionFilterOptionsQuery_AuthenticationCategory_IncludesOnlyRecordedAuthActionsAndExcludesUnrecordedAndOtherCategories()
    {
        // Arrange: Authentication has LoginSucceeded, LogoutSucceeded, TokenRefreshSucceeded.
        // No LoginFailed or TokenRefreshFailed exist. Data has ActivityCreated.
        var logs = new List<AuditLog>
        {
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Authentication, Action = AuthenticationAuditActions.LoginSucceeded, TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Authentication, Action = AuthenticationAuditActions.LoginSucceeded, TimestampUtc = DateTime.UtcNow.AddMinutes(-1) },
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Authentication, Action = AuthenticationAuditActions.LogoutSucceeded, TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Authentication, Action = AuthenticationAuditActions.TokenRefreshSucceeded, TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Data, Action = "ActivityCreated", TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Data, Action = "ActivityUpdated", TimestampUtc = DateTime.UtcNow }
        };

        // Act
        var actions = AuditQueryService.ApplyActionFilterOptionsQuery(
            logs.AsQueryable(),
            AuditCategory.Authentication).ToList();

        // Assert: Only the 3 present Authentication actions are returned; LoginFailed, TokenRefreshFailed, and Data actions are excluded.
        Assert.Equal(3, actions.Count);
        Assert.Equal(
            [
                AuthenticationAuditActions.LoginSucceeded,
                AuthenticationAuditActions.LogoutSucceeded,
                AuthenticationAuditActions.TokenRefreshSucceeded
            ],
            actions);
        Assert.DoesNotContain(AuthenticationAuditActions.LoginFailed, actions);
        Assert.DoesNotContain(AuthenticationAuditActions.TokenRefreshFailed, actions);
        Assert.DoesNotContain("ActivityCreated", actions);
    }

    [Fact]
    public void ApplyActionFilterOptionsQuery_WhenLoginFailedOrTokenRefreshFailedExist_IncludesThem()
    {
        // Arrange
        var logs = new List<AuditLog>
        {
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Authentication, Action = AuthenticationAuditActions.LoginFailed, TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Authentication, Action = AuthenticationAuditActions.TokenRefreshFailed, TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Authentication, Action = AuthenticationAuditActions.LoginSucceeded, TimestampUtc = DateTime.UtcNow }
        };

        // Act
        var actions = AuditQueryService.ApplyActionFilterOptionsQuery(
            logs.AsQueryable(),
            AuditCategory.Authentication).ToList();

        // Assert
        Assert.Equal(3, actions.Count);
        Assert.Contains(AuthenticationAuditActions.LoginFailed, actions);
        Assert.Contains(AuthenticationAuditActions.TokenRefreshFailed, actions);
        Assert.Contains(AuthenticationAuditActions.LoginSucceeded, actions);
    }

    [Fact]
    public void ApplyActionFilterOptionsQuery_WhenNoMatchingRecordsExist_ReturnsEmptyList()
    {
        // Arrange: Only Data records exist, querying for Authentication
        var logs = new List<AuditLog>
        {
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Data, Action = "ActivityCreated", TimestampUtc = DateTime.UtcNow }
        };

        // Act
        var authActions = AuditQueryService.ApplyActionFilterOptionsQuery(
            logs.AsQueryable(),
            AuditCategory.Authentication).ToList();
        var emptySourceActions = AuditQueryService.ApplyActionFilterOptionsQuery(
            Enumerable.Empty<AuditLog>().AsQueryable(),
            null).ToList();

        // Assert
        Assert.Empty(authActions);
        Assert.Empty(emptySourceActions);
    }

    [Fact]
    public void ApplyUserFilterOptionsQuery_FiltersByCategoryAndActionCorrectly_IncludingActorEmailRecords()
    {
        // Arrange
        var authUser = Guid.NewGuid();
        var dataUser = Guid.NewGuid();

        var logs = new List<AuditLog>
        {
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Authentication, Action = AuthenticationAuditActions.LoginSucceeded, UserId = authUser, TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Authentication, Action = AuthenticationAuditActions.LoginFailed, UserId = null, ActorEmail = "test@test.com", TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Authentication, Action = AuthenticationAuditActions.LoginFailed, UserId = null, ActorEmail = null, TimestampUtc = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Category = AuditCategory.Data, Action = "ActivityCreated", UserId = dataUser, TimestampUtc = DateTime.UtcNow }
        };

        // Act
        var authActors = AuditQueryService.ApplyUserFilterOptionsQuery(
            logs.AsQueryable(),
            AuditCategory.Authentication,
            AuthenticationAuditActions.LoginSucceeded).ToList();

        var loginFailedActors = AuditQueryService.ApplyUserFilterOptionsQuery(
            logs.AsQueryable(),
            AuditCategory.Authentication,
            AuthenticationAuditActions.LoginFailed).ToList();

        var unrecordedActionActors = AuditQueryService.ApplyUserFilterOptionsQuery(
            logs.AsQueryable(),
            AuditCategory.Authentication,
            AuthenticationAuditActions.TokenRefreshFailed).ToList();

        // Assert
        var singleActor = Assert.Single(authActors);
        Assert.Equal(authUser, singleActor.UserId);

        var singleFailedActor = Assert.Single(loginFailedActors);
        Assert.Null(singleFailedActor.UserId);
        Assert.Equal("test@test.com", singleFailedActor.ActorEmail);

        Assert.Empty(unrecordedActionActors);
    }

    [Fact]
    public async Task GetFilterOptionsAsync_IntegrationWithDatabase_ExcludesUnrecordedActionsAndResolvesUsersIncludingFailedLoginActors()
    {
        // Arrange: Connect to local PostgreSQL inside an uncommitted transaction so no data is mutated.
        // Connection string is read from environment variable 'ConnectionStrings__DefaultConnection' or falls back to standard local dev credentials.
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=DailyActivityTracker;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        await using var context = new ApplicationDbContext(options);
        if (!await context.Database.CanConnectAsync())
        {
            // Skip live DB verification only if local PostgreSQL is not running in this environment
            return;
        }

        await using var tx = await context.Database.BeginTransactionAsync();

        var service = new AuditQueryService(context);
        var controller = new AdminAuditLogsController(service);

        // 1. Clean slate inside rolled-back transaction to test exact Authentication action & user resolution
        await context.AuditLogs
            .Where(x => x.Category == AuditCategory.Authentication)
            .ExecuteDeleteAsync();

        var existingUser = await context.Users.AsNoTracking().FirstAsync();

        context.AuditLogs.AddRange(
            new AuditLog
            {
                Id = Guid.NewGuid(),
                Category = AuditCategory.Authentication,
                Action = AuthenticationAuditActions.LoginSucceeded,
                UserId = existingUser.Id,
                ActorEmail = existingUser.Email,
                ActorRole = existingUser.Role,
                TimestampUtc = DateTime.UtcNow.AddMinutes(-2)
            },
            new AuditLog
            {
                Id = Guid.NewGuid(),
                Category = AuditCategory.Authentication,
                Action = AuthenticationAuditActions.LogoutSucceeded,
                UserId = existingUser.Id,
                ActorEmail = existingUser.Email,
                ActorRole = existingUser.Role,
                TimestampUtc = DateTime.UtcNow.AddMinutes(-1)
            },
            new AuditLog
            {
                Id = Guid.NewGuid(),
                Category = AuditCategory.Authentication,
                Action = AuthenticationAuditActions.TokenRefreshSucceeded,
                UserId = existingUser.Id,
                ActorEmail = existingUser.Email,
                ActorRole = existingUser.Role,
                TimestampUtc = DateTime.UtcNow
            });
        await context.SaveChangesAsync();

        var initialAuthResult = await controller.GetFilterOptions(
            new AuditFilterOptionsQueryParameters { Category = AuditCategory.Authentication },
            CancellationToken.None);
        var initialOk = Assert.IsType<OkObjectResult>(initialAuthResult.Result);
        var initialResponse = Assert.IsType<AuditFilterOptionsResponse>(initialOk.Value);

        Assert.Equal(
            [
                AuthenticationAuditActions.LoginSucceeded,
                AuthenticationAuditActions.LogoutSucceeded,
                AuthenticationAuditActions.TokenRefreshSucceeded
            ],
            initialResponse.Actions);
        Assert.DoesNotContain(AuthenticationAuditActions.LoginFailed, initialResponse.Actions);
        Assert.DoesNotContain(AuthenticationAuditActions.TokenRefreshFailed, initialResponse.Actions);
        Assert.DoesNotContain("ActivityCreated", initialResponse.Actions);
        Assert.Contains(initialResponse.Users, u => u.UserId == existingUser.Id && u.Email == existingUser.Email);

        // 2. Insert a LoginFailed record with UserId = null and ActorEmail = existingUser.Email (matching AuthService behavior)
        context.AuditLogs.AddRange(
            new AuditLog
            {
                Id = Guid.NewGuid(),
                Category = AuditCategory.Authentication,
                Action = AuthenticationAuditActions.LoginFailed,
                UserId = null,
                ActorEmail = existingUser.Email,
                TimestampUtc = DateTime.UtcNow
            },
            new AuditLog
            {
                Id = Guid.NewGuid(),
                Category = AuditCategory.Authentication,
                Action = AuthenticationAuditActions.TokenRefreshFailed,
                UserId = null,
                TimestampUtc = DateTime.UtcNow
            });
        await context.SaveChangesAsync();

        var loginFailedFilterResult = await controller.GetFilterOptions(
            new AuditFilterOptionsQueryParameters
            {
                Category = AuditCategory.Authentication,
                Action = AuthenticationAuditActions.LoginFailed
            },
            CancellationToken.None);
        var loginFailedFilterOk = Assert.IsType<OkObjectResult>(loginFailedFilterResult.Result);
        var loginFailedFilterResponse = Assert.IsType<AuditFilterOptionsResponse>(loginFailedFilterOk.Value);

        Assert.Contains(AuthenticationAuditActions.LoginFailed, loginFailedFilterResponse.Actions);
        Assert.Contains(AuthenticationAuditActions.TokenRefreshFailed, loginFailedFilterResponse.Actions);
        // Verify User dropdown includes existingUser even though LoginFailed has UserId = null in DB
        Assert.Contains(loginFailedFilterResponse.Users, u => u.UserId == existingUser.Id && u.Email == existingUser.Email);

        // Verify GetAuditLogs with UserId + Action = LoginFailed returns the LoginFailed log for existingUser
        var loginFailedLogsResult = await controller.GetAuditLogs(
            new AuditLogQueryParameters
            {
                Category = AuditCategory.Authentication,
                Action = AuthenticationAuditActions.LoginFailed,
                UserId = existingUser.Id
            },
            CancellationToken.None);
        var loginFailedLogsOk = Assert.IsType<OkObjectResult>(loginFailedLogsResult.Result);
        var loginFailedLogsResponse = Assert.IsType<PagedResponse<AuditLogResponse>>(loginFailedLogsOk.Value);
        Assert.Single(loginFailedLogsResponse.Items);
        Assert.Equal(AuthenticationAuditActions.LoginFailed, loginFailedLogsResponse.Items[0].Action);
        Assert.Equal(existingUser.Email, loginFailedLogsResponse.Items[0].ActorEmail);

        // 3. Remove all Authentication records in transaction and verify empty Actions & Users list is returned
        await context.AuditLogs
            .Where(x => x.Category == AuditCategory.Authentication)
            .ExecuteDeleteAsync();

        var emptyAuthResult = await controller.GetFilterOptions(
            new AuditFilterOptionsQueryParameters { Category = AuditCategory.Authentication },
            CancellationToken.None);
        var emptyAuthOk = Assert.IsType<OkObjectResult>(emptyAuthResult.Result);
        var emptyAuthResponse = Assert.IsType<AuditFilterOptionsResponse>(emptyAuthOk.Value);

        Assert.Empty(emptyAuthResponse.Actions);
        Assert.Empty(emptyAuthResponse.Users);

        await tx.RollbackAsync();
    }
}

public class AuditLogQueryParametersValidatorTests
{
    private readonly AuditLogQueryParametersValidator _validator = new();

    [Theory]
    [InlineData(1)]
    [InlineData(10)]
    public void Validate_WhenPageIsPositive_ShouldBeValid(int page)
    {
        var model = new AuditLogQueryParameters { Page = page };
        var result = _validator.Validate(model);
        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_WhenPageIsZeroOrNegative_ShouldBeInvalid(int page)
    {
        var model = new AuditLogQueryParameters { Page = page };
        var result = _validator.Validate(model);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(AuditLogQueryParameters.Page));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(50)]
    [InlineData(100)]
    public void Validate_WhenPageSizeIsWithin1And100_ShouldBeValid(int pageSize)
    {
        var model = new AuditLogQueryParameters { PageSize = pageSize };
        var result = _validator.Validate(model);
        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(101)]
    [InlineData(200)]
    public void Validate_WhenPageSizeExceedsRange_ShouldBeInvalid(int pageSize)
    {
        var model = new AuditLogQueryParameters { PageSize = pageSize };
        var result = _validator.Validate(model);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(AuditLogQueryParameters.PageSize));
    }

    [Theory]
    [InlineData("2026-11-01", "2026-11-02")]
    [InlineData("2026-11-01", "2026-11-01")]
    [InlineData("2026-11-01T10:00:00Z", "2026-11-01T10:00:00Z")]
    [InlineData("2026-11-01T10:00:00Z", "2026-11-01T10:30:00Z")]
    public void Validate_WhenFromIsBeforeOrEqualToTo_ShouldBeValid(string from, string to)
    {
        var model = new AuditLogQueryParameters { From = from, To = to };
        var result = _validator.Validate(model);
        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("2026-11-03", "2026-11-02")]
    [InlineData("2026-11-01T12:00:00Z", "2026-11-01T11:00:00Z")]
    public void Validate_WhenFromIsAfterTo_ShouldBeInvalid(string from, string to)
    {
        var model = new AuditLogQueryParameters { From = from, To = to };
        var result = _validator.Validate(model);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "DateRange" || e.ErrorMessage.Contains("'From' date"));
    }

    [Theory]
    [InlineData("not-a-date")]
    [InlineData("2026/11/01")]
    [InlineData("invalid-timestamp")]
    public void Validate_WhenFromOrToHasInvalidFormat_ShouldBeInvalid(string invalidDate)
    {
        var model = new AuditLogQueryParameters { From = invalidDate, To = invalidDate };
        var result = _validator.Validate(model);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(AuditLogQueryParameters.From));
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(AuditLogQueryParameters.To));
    }

    [Fact]
    public void Validate_WhenCategoryIsInvalidEnum_ShouldBeInvalid()
    {
        var model = new AuditLogQueryParameters { Category = (AuditCategory)999 };
        var result = _validator.Validate(model);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(AuditLogQueryParameters.Category));
    }
}
