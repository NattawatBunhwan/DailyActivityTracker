using DailyActivityTracker.Domain.Common;

namespace DailyActivityTracker.Domain.Entities;

public class User : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public int Age { get; set; }

    public string Occupation { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = "User";

    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
}
