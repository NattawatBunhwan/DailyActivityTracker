namespace DailyActivityTracker.Application.DTOs.Auth;

public class MeResponse
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}