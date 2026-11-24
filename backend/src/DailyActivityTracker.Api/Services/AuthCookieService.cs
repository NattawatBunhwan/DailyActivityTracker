using DailyActivityTracker.Api.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace DailyActivityTracker.Api.Services;

public interface IAuthCookieService
{
    string? GetRefreshToken(HttpRequest request);
    void SetRefreshTokenCookie(HttpResponse response, string refreshToken, DateTime? expiresAt = null);
    void ClearRefreshTokenCookie(HttpResponse response);
}

public class AuthCookieService : IAuthCookieService
{
    private readonly AuthCookieSettings _settings;

    public AuthCookieService(IOptions<AuthCookieSettings> options)
    {
        _settings = options.Value ?? new AuthCookieSettings();
    }

    public string? GetRefreshToken(HttpRequest request)
    {
        if (request.Cookies.TryGetValue(_settings.CookieName, out var token) && !string.IsNullOrWhiteSpace(token))
        {
            return token.Trim();
        }

        return null;
    }

    public void SetRefreshTokenCookie(HttpResponse response, string refreshToken, DateTime? expiresAt = null)
    {
        var cookieOptions = CreateBaseCookieOptions();
        cookieOptions.Expires = expiresAt ?? DateTimeOffset.UtcNow.AddDays(_settings.ExpirationDays);

        response.Cookies.Append(_settings.CookieName, refreshToken, cookieOptions);
    }

    public void ClearRefreshTokenCookie(HttpResponse response)
    {
        var cookieOptions = CreateBaseCookieOptions();
        cookieOptions.Expires = DateTimeOffset.UtcNow.AddDays(-1);

        response.Cookies.Append(_settings.CookieName, string.Empty, cookieOptions);
    }

    private CookieOptions CreateBaseCookieOptions()
    {
        var options = new CookieOptions
        {
            HttpOnly = _settings.HttpOnly,
            Secure = _settings.Secure == CookieSecurePolicy.Always,
            SameSite = _settings.SameSite,
            Path = string.IsNullOrWhiteSpace(_settings.Path) ? AuthCookieSettings.DefaultPath : _settings.Path
        };

        if (!string.IsNullOrWhiteSpace(_settings.Domain))
        {
            options.Domain = _settings.Domain;
        }

        return options;
    }
}
