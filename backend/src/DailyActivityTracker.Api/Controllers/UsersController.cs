using DailyActivityTracker.Application.Features.Users.DTOs;
using DailyActivityTracker.Application.Features.Users.Services;
using DailyActivityTracker.Application.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace DailyActivityTracker.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ICurrentUserService _currentUserService;

    public UsersController(IUserService userService, ICurrentUserService currentUserService)
    {
        _userService = userService;
        _currentUserService = currentUserService;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<UserResponse>> Create(
        CreateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _userService.CreateAsync(request, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { userId = user.Id }, user);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult<List<UserResponse>>> GetAll(CancellationToken cancellationToken = default)
    {
        var users = await _userService.GetAllAsync(cancellationToken);

        return Ok(users);
    }

    [HttpGet("{userId:guid}")]
    public async Task<ActionResult<UserResponse>> GetById(Guid userId, CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;
        
        var user = await _userService.GetByIdAsync(userId, currentUserId, cancellationToken);

        return Ok(user);
    }

    [HttpPut("{userId:guid}")]
    public async Task<ActionResult<UserResponse>> Update(
        Guid userId,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;

        var user = await _userService.UpdateAsync(userId, currentUserId, request, cancellationToken);

        if (user is null)
        {
            return NotFound();
        }

        return Ok(user);
    }

    [HttpDelete("{userId:guid}")]
    public async Task<IActionResult> Delete(Guid userId, CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;
        
        var deleted = await _userService.DeleteAsync(userId, currentUserId, cancellationToken);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}
