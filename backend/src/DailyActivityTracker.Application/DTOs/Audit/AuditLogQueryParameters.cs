using System.Globalization;
using DailyActivityTracker.Domain.Enums;

namespace DailyActivityTracker.Application.DTOs.Audit;

public class AuditLogQueryParameters
{
    private static readonly string[] AllowedDateTimeFormats =
    [
        "yyyy-MM-ddTHH:mm:ss",
        "yyyy-MM-ddTHH:mm:ssZ",
        "yyyy-MM-ddTHH:mm:ss.fff",
        "yyyy-MM-ddTHH:mm:ss.fffZ",
        "yyyy-MM-ddTHH:mm:ssK",
        "yyyy-MM-ddTHH:mm:ss.fffK",
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-dd HH:mm:ssZ"
    ];

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;

    public AuditCategory? Category { get; set; }

    public string? Action { get; set; }

    public Guid? UserId { get; set; }

    public string? From { get; set; }

    public string? To { get; set; }

    public static bool TryParseUtcBoundary(
        string? input,
        bool isUpperBound,
        out DateTime? boundaryUtc,
        out bool isExclusiveUpper,
        out string? errorMessage)
    {
        boundaryUtc = null;
        isExclusiveUpper = false;
        errorMessage = null;

        if (string.IsNullOrWhiteSpace(input))
        {
            return true;
        }

        var trimmed = input.Trim();

        // 1. Date-only format: yyyy-MM-dd
        if (DateOnly.TryParseExact(trimmed, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateOnly))
        {
            if (isUpperBound)
            {
                // Exclusive upper bound at start of next day (00:00:00 UTC)
                boundaryUtc = DateTime.SpecifyKind(dateOnly.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
                isExclusiveUpper = true;
            }
            else
            {
                // Inclusive lower bound at start of the day (00:00:00 UTC)
                boundaryUtc = DateTime.SpecifyKind(dateOnly.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
                isExclusiveUpper = false;
            }

            return true;
        }

        // 2. Exact ISO 8601 DateTime formats
        if (DateTimeOffset.TryParseExact(
                trimmed,
                AllowedDateTimeFormats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var dateTimeOffset))
        {
            boundaryUtc = dateTimeOffset.UtcDateTime;
            isExclusiveUpper = false;
            return true;
        }

        // Standard round-trip ISO 8601 format: "O" / "o" (e.g. 2026-11-03T14:30:00.0000000Z)
        if (DateTimeOffset.TryParseExact(
                trimmed,
                "O",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var roundTripDto))
        {
            boundaryUtc = roundTripDto.UtcDateTime;
            isExclusiveUpper = false;
            return true;
        }

        errorMessage = $"Invalid date format '{input}'. Supported formats are 'yyyy-MM-dd' or ISO 8601 UTC date-time.";
        return false;
    }
}
