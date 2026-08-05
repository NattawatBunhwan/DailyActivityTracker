using DailyActivityTracker.Application.Features.Activities.DTOs;
using DailyActivityTracker.Application.Features.Activities.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace DailyActivityTracker.Api.Controllers;

[ApiController]
[Route("api/activities")]
[Authorize]
public class ActivitiesController : ControllerBase
{
    private readonly IActivityService _activityService;

    public ActivitiesController(IActivityService activityService)
    {
        _activityService = activityService;
    }

    [HttpPost]
    public async Task<ActionResult<ActivityResponse>> Create(CreateActivityRequest request, CancellationToken cancellationToken = default)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var activity = await _activityService.CreateAsync(userId, request, cancellationToken);

        if (activity is null)
        {
            return BadRequest("User does not exist.");
        }

        return CreatedAtAction(nameof(GetById), new { id = activity.Id }, activity);
    }

    [HttpGet]
    public async Task<ActionResult<List<ActivityResponse>>> GetAll(CancellationToken cancellationToken = default)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var activities = await _activityService.GetAllAsync(cancellationToken);

        return Ok(activities);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ActivityResponse>> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        var activity = await _activityService.GetByIdAsync(id, cancellationToken);

        if (activity is null)
        {
            return NotFound();
        }

        return Ok(activity);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ActivityResponse>> Update(
        Guid id,
        UpdateActivityRequest request,
        CancellationToken cancellationToken = default)
    {
        var activity = await _activityService.UpdateAsync(id, request, cancellationToken);

        if (activity is null)
        {
            return NotFound();
        }

        return Ok(activity);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await _activityService.DeleteAsync(id, cancellationToken);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}
