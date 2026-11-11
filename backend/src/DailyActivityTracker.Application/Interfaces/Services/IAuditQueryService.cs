using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Application.DTOs.Audit;

namespace DailyActivityTracker.Application.Interfaces.Services;

public interface IAuditQueryService
{
    Task<PagedResponse<AuditLogResponse>> GetAuditLogsAsync(AuditLogQueryParameters query, CancellationToken cancellationToken = default);

    Task<AuditFilterOptionsResponse> GetFilterOptionsAsync(AuditFilterOptionsQueryParameters? query = null, CancellationToken cancellationToken = default);
}
