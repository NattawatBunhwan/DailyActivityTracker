using DailyActivityTracker.Application.Features.Users.DTOs;
using DailyActivityTracker.Application.Features.Users.Services;
using DailyActivityTracker.Application.Exceptions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace DailyActivityTracker.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<UserResponse>> Create(
        CreateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _userService.CreateAsync(request, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpGet]
    public async Task<ActionResult<List<UserResponse>>> GetAll(CancellationToken cancellationToken = default)
    {
        var users = await _userService.GetAllAsync(cancellationToken);

        return Ok(users);
    }

    [HttpGet("{userId:guid}")]
    public async Task<ActionResult<UserResponse>> GetById(Guid userId, CancellationToken cancellationToken = default)
    {
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        
        var user = await _userService.GetByIdAsync(userId, currentUserId, cancellationToken);

        return Ok(user);
    }

    [HttpPut("{userId:guid}")]
    public async Task<ActionResult<UserResponse>> Update(
        Guid userId,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

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
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        
        var deleted = await _userService.DeleteAsync(userId, currentUserId, cancellationToken);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}
