using DailyActivityTracker.Application.Features.Users.DTOs;
using DailyActivityTracker.Application.Features.Users.Services;
using DailyActivityTracker.Application.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace DailyActivityTracker.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPost]
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

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserResponse>> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);

        return Ok(user);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserResponse>> Update(
        Guid id,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _userService.UpdateAsync(id, request, cancellationToken);

        if (user is null)
        {
            return NotFound();
        }

        return Ok(user);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await _userService.DeleteAsync(id, cancellationToken);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}
