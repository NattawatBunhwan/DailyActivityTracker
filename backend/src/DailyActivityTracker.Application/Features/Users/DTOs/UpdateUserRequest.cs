namespace DailyActivityTracker.Application.Features.Users.DTOs;

public class UpdateUserRequest
{
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public int Age { get; set; }

    public string Occupation { get; set; } = string.Empty;
}
