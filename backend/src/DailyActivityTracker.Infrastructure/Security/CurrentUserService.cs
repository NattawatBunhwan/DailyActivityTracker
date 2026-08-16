using System.Security.Claims;
using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Interfaces.Services;
using Microsoft.AspNetCore.Http;

namespace DailyActivityTracker.Infrastructure.Security;

public sealed class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public Guid UserId
    {
        get
        {
            var userId = GetRequiredClaim(ClaimTypes.NameIdentifier);

            return Guid.TryParse(userId, out var parsedUserId)
                ? parsedUserId
                : throw new UnauthorizedException("The authenticated user's identifier is invalid.");
        }
    }

    public string Email => GetRequiredClaim(ClaimTypes.Email);

    public string Role => GetRequiredClaim(ClaimTypes.Role);

    private string GetRequiredClaim(string claimType)
    {
        var claimValue = httpContextAccessor.HttpContext?.User.FindFirstValue(claimType);

        return string.IsNullOrWhiteSpace(claimValue)
            ? throw new UnauthorizedException("The authenticated user does not have the required claim.")
            : claimValue;
    }
}
