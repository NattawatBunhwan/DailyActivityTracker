using Microsoft.AspNetCore.Http;

namespace DailyActivityTracker.Api.Configuration;

public class AuthCookieSettings
{
    public const string SectionName = "AuthCookie";
    public const string DefaultCookieName = "refreshToken";
    public const string DefaultPath = "/api/Auth";

    public string CookieName { get; set; } = DefaultCookieName;
    public string Path { get; set; } = DefaultPath;
    public string? Domain { get; set; }
    public SameSiteMode SameSite { get; set; } = SameSiteMode.Lax;
    public CookieSecurePolicy Secure { get; set; } = CookieSecurePolicy.Always;
    public bool HttpOnly { get; set; } = true;
    public int ExpirationDays { get; set; } = 7;
}
