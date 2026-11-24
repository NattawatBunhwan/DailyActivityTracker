using System.Text.Json.Serialization;

namespace DailyActivityTracker.Application.DTOs.Auth;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Always)]
    public string RefreshToken { get; set; } = string.Empty;
}