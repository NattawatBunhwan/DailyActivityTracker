using DailyActivityTracker.Application.DTOs.Auth;
using DailyActivityTracker.Application.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace DailyActivityTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<LoginResponse> Login([FromBody]LoginRequest request, CancellationToken cancellationToken = default)
    {
        var response = await _authService.LoginAsync(request, cancellationToken);

        return response;
    }
}