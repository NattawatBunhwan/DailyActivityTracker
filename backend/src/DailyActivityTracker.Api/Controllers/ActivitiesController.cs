using DailyActivityTracker.Application.Features.Activities.DTOs;
using DailyActivityTracker.Application.Features.Activities.Services;
using DailyActivityTracker.Application.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using DailyActivityTracker.Application.Common;

namespace DailyActivityTracker.Api.Controllers;

[ApiController]
[Route("api/activities")]
[Authorize]
public class ActivitiesController : ControllerBase
{
    private readonly IActivityService _activityService;
    private readonly ICurrentUserService _currentUserService;

    public ActivitiesController(IActivityService activityService, ICurrentUserService currentUserService)
    {
        _activityService = activityService;
        _currentUserService = currentUserService;
    }

    [HttpPost]
    public async Task<ActionResult<ActivityResponse>> Create(CreateActivityRequest request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        
        var activity = await _activityService.CreateAsync(userId, request, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = activity.Id }, activity);
    }

    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [HttpGet]
    public async Task<ActionResult<PagedResponse<ActivityResponse>>> GetAll([FromQuery] ActivityQueryParameters query, CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;

        var activities = await _activityService.GetAllAsync(currentUserId, query, cancellationToken);

        return Ok(activities);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ActivityResponse>> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;

        var activity = await _activityService.GetByIdAsync(id, currentUserId, cancellationToken);

        if (activity is null)
        {
            return NotFound();
        }

        return Ok(activity);
    }

    [HttpPut("{activityId:guid}")]
    public async Task<ActionResult<ActivityResponse>> Update(
        Guid activityId,
        UpdateActivityRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;

        var activity = await _activityService.UpdateAsync(activityId, currentUserId, request, cancellationToken);

        if (activity is null)
        {
            return NotFound();
        }

        return Ok(activity);
    }

    [HttpDelete("{activityId:guid}")]
    public async Task<IActionResult> Delete(Guid activityId, CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;
        
        var deleted = await _activityService.DeleteAsync(activityId, currentUserId, cancellationToken);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}
