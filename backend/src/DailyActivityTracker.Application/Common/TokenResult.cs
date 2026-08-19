namespace DailyActivityTracker.Application.Common;

public sealed class TokenResult
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; init; }
}