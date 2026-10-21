using DailyActivityTracker.Application.Features.Activities.DTOs;
using DailyActivityTracker.Domain.Enums;

namespace DailyActivityTracker.Application.Common
{
    public class ActivitiesListResponse
    {
        public PagedResponse<ActivityResponse> Activities { get; set; } = new();

        public List<ActivityStatus> AvailableStatuses { get; set; } = [];

        public List<ActivityPriority> AvailablePriorities { get; set; } = [];
    }
}
