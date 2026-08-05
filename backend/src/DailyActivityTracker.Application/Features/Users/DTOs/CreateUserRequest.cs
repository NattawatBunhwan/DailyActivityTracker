namespace DailyActivityTracker.Application.Features.Users.DTOs;

public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;
    
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public int Age { get; set; }

    public string Occupation { get; set; } = string.Empty;
}
