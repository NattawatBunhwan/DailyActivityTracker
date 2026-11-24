namespace DailyActivityTracker.Application.DTOs.Auth;

public class AuthTokenResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}
