using DailyActivityTracker.Domain.Common;
using DailyActivityTracker.Domain.Enums;

namespace DailyActivityTracker.Domain.Entities;

public class Activity : BaseEntity
{
    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime ActivityDate { get; set; }

    public ActivityStatus Status { get; set; }

    public ActivityPriority Priority { get; set; }
}
