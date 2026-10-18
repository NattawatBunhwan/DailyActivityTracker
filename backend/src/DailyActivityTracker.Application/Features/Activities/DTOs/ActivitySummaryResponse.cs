namespace DailyActivityTracker.Application.Features.Activities.DTOs
{
    public class ActivitySummaryResponse
    {
        public int TotalActivities { get; set; }
        public int PendingCount { get; set; }
        public int InProgressCount { get; set; }
        public int CompletedCount { get; set; }
    }
}
