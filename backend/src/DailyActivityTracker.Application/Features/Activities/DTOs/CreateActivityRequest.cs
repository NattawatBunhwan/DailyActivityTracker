using DailyActivityTracker.Domain.Enums;

namespace DailyActivityTracker.Application.Features.Activities.DTOs;

public class CreateActivityRequest
{
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime ActivityDate { get; set; }

    public ActivityStatus Status { get; set; }

    public ActivityPriority Priority { get; set; }
}
