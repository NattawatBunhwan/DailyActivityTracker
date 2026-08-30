using DailyActivityTracker.Domain.Enums;

namespace DailyActivityTracker.Application.Features.Activities.DTOs;

public class ActivityQueryParameters
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public ActivityStatus? Status { get; set; }
    public ActivityPriority? Priority { get; set; }
    public string? Search { get; set; }
    public string? SortBy { get; set; }
    public bool Descending { get; set; }
}