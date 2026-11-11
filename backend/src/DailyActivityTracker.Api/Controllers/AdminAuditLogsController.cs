using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Application.DTOs.Audit;
using DailyActivityTracker.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DailyActivityTracker.Api.Controllers;

[ApiController]
[Route("api/admin/audit-logs")]
[Authorize(Policy = AuthorizationPolicies.AdminOnly)]
public class AdminAuditLogsController : ControllerBase
{
    private readonly IAuditQueryService _auditQueryService;

    public AdminAuditLogsController(IAuditQueryService auditQueryService)
    {
        _auditQueryService = auditQueryService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<AuditLogResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResponse<AuditLogResponse>>> GetAuditLogs(
        [FromQuery] AuditLogQueryParameters query,
        CancellationToken cancellationToken = default)
    {
        var result = await _auditQueryService.GetAuditLogsAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("filters")]
    [ProducesResponseType(typeof(AuditFilterOptionsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AuditFilterOptionsResponse>> GetFilterOptions([FromQuery] AuditFilterOptionsQueryParameters query, CancellationToken cancellationToken = default)
    {
        var result = await _auditQueryService.GetFilterOptionsAsync(query, cancellationToken);
        return Ok(result);
    }
}
