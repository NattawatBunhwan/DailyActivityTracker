namespace DailyActivityTracker.Application.Common;

public class PagedResponse<T>
{
    public List<T> Items { get; set; } = [];

    public int Page { get; set; }

    public int PageSize { get; set; }

    public int TotalCount { get; set; }

    public int TotalPages { get; set; }

    public bool HasPreviousPage => Page > 1 && TotalPages > 0;

    public bool HasNextPage => Page < TotalPages;
}
