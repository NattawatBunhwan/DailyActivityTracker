namespace DailyActivityTracker.Application.Common;

public static class AuthenticationAuditActions
{
    public const string LoginSucceeded = nameof(LoginSucceeded);
    public const string LoginFailed = nameof(LoginFailed);
    public const string TokenRefreshSucceeded = nameof(TokenRefreshSucceeded);
    public const string TokenRefreshFailed = nameof(TokenRefreshFailed);
    public const string LogoutSucceeded = nameof(LogoutSucceeded);
}
