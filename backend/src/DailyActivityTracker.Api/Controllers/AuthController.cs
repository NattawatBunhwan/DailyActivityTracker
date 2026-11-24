using DailyActivityTracker.Api.Filters;
using DailyActivityTracker.Api.Services;
using DailyActivityTracker.Application.DTOs.Auth;
using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DailyActivityTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IAuthCookieService _authCookieService;

    public AuthController(IAuthService authService, IAuthCookieService? authCookieService = null)
    {
        _authService = authService;
        _authCookieService = authCookieService ?? new AuthCookieService(Microsoft.Extensions.Options.Options.Create(new Configuration.AuthCookieSettings()));
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody]LoginRequest request, CancellationToken cancellationToken = default)
    {
        var response = await _authService.LoginAsync(request, cancellationToken);

        if (!string.IsNullOrWhiteSpace(response.RefreshToken))
        {
            _authCookieService.SetRefreshTokenCookie(Response, response.RefreshToken);
        }

        return Ok(new LoginResponse
        {
            Token = response.Token,
            ExpiresAt = response.ExpiresAt,
            RefreshToken = string.Empty
        });
    }

    [AllowAnonymous]
    [ValidateOrigin]
    [HttpPost("refresh")]
    public async Task<ActionResult<LoginResponse>> Refresh([FromBody]RefreshTokenRequest? request, CancellationToken cancellationToken)
    {
        var cookieToken = _authCookieService.GetRefreshToken(Request);
        if (string.IsNullOrWhiteSpace(cookieToken))
        {
            _authCookieService.ClearRefreshTokenCookie(Response);
            throw new RefreshTokenExpiredException();
        }

        var refreshRequest = new RefreshTokenRequest
        {
            RefreshToken = cookieToken
        };

        try
        {
            var response = await _authService.RefreshAsync(refreshRequest, cancellationToken);

            if (!string.IsNullOrWhiteSpace(response.RefreshToken))
            {
                _authCookieService.SetRefreshTokenCookie(Response, response.RefreshToken);
            }

            return Ok(new LoginResponse
            {
                Token = response.Token,
                ExpiresAt = response.ExpiresAt,
                RefreshToken = string.Empty
            });
        }
        catch (RefreshTokenExpiredException)
        {
            _authCookieService.ClearRefreshTokenCookie(Response);
            throw;
        }
    }

    [AllowAnonymous]
    [ValidateOrigin]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody]LogoutRequest? request, CancellationToken cancellationToken)
    {
        var cookieToken = _authCookieService.GetRefreshToken(Request);
        var effectiveToken = !string.IsNullOrWhiteSpace(cookieToken)
            ? cookieToken
            : request?.RefreshToken;

        _authCookieService.ClearRefreshTokenCookie(Response);

        if (!string.IsNullOrWhiteSpace(effectiveToken))
        {
            try
            {
                await _authService.LogoutAsync(new LogoutRequest { RefreshToken = effectiveToken }, cancellationToken);
            }
            catch (RefreshTokenExpiredException)
            {
                // Silently succeed if token was already expired or revoked during logout
            }
        }

        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeResponse>> GetMe(CancellationToken cancellationToken)
    {
        var response = await _authService.GetMeAsync(cancellationToken);

        return Ok(response);
    }
}