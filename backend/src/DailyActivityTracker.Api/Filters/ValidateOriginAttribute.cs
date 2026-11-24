using DailyActivityTracker.Application.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DailyActivityTracker.Api.Filters;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
public class ValidateOriginAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpContext = context.HttpContext;
        var configuration = httpContext.RequestServices.GetRequiredService<IConfiguration>();

        var allowedOrigins = CorsSettingsValidator.ValidateAllowedOrigins(
            configuration.GetSection("Cors:AllowedOrigins").Get<string[]>());

        var secFetchSite = httpContext.Request.Headers["Sec-Fetch-Site"].ToString();
        var isCrossSiteFetch = !string.IsNullOrWhiteSpace(secFetchSite) &&
            secFetchSite.Equals("cross-site", StringComparison.OrdinalIgnoreCase);

        var originHeader = httpContext.Request.Headers.Origin.ToString();

        // Reject explicit "null" origin (e.g. sandboxed iframes or privacy redirects)
        if (string.Equals(originHeader, "null", StringComparison.OrdinalIgnoreCase))
        {
            context.Result = new ForbidResult();
            return;
        }

        if (string.IsNullOrWhiteSpace(originHeader))
        {
            // Never allow Referer fallback when Sec-Fetch-Site is explicitly cross-site
            if (isCrossSiteFetch)
            {
                context.Result = new ForbidResult();
                return;
            }

            var refererHeader = httpContext.Request.Headers.Referer.ToString();
            if (!string.IsNullOrWhiteSpace(refererHeader) &&
                Uri.TryCreate(refererHeader, UriKind.Absolute, out var refererUri) &&
                (refererUri.Scheme == Uri.UriSchemeHttp || refererUri.Scheme == Uri.UriSchemeHttps))
            {
                var portPart = refererUri.IsDefaultPort ? "" : $":{refererUri.Port}";
                originHeader = $"{refererUri.Scheme}://{refererUri.DnsSafeHost}{portPart}";
            }
        }
        else if (!Uri.TryCreate(originHeader, UriKind.Absolute, out var explicitOriginUri) ||
                 (explicitOriginUri.Scheme != Uri.UriSchemeHttp && explicitOriginUri.Scheme != Uri.UriSchemeHttps) ||
                 explicitOriginUri.AbsolutePath != "/" ||
                 !string.IsNullOrEmpty(explicitOriginUri.Query) ||
                 !string.IsNullOrEmpty(explicitOriginUri.Fragment))
        {
            context.Result = new ForbidResult();
            return;
        }

        if (string.IsNullOrWhiteSpace(originHeader))
        {
            // Origin or verifiable referer is required for state-changing cookie operations
            context.Result = new ForbidResult();
            return;
        }

        if (!Uri.TryCreate(originHeader, UriKind.Absolute, out var originUri) ||
            (originUri.Scheme != Uri.UriSchemeHttp && originUri.Scheme != Uri.UriSchemeHttps))
        {
            context.Result = new ForbidResult();
            return;
        }

        var effectivePort = originUri.IsDefaultPort ? "" : $":{originUri.Port}";
        var normalizedOrigin = $"{originUri.Scheme}://{originUri.DnsSafeHost}{effectivePort}";

        var isAllowed = allowedOrigins.Any(allowed =>
            string.Equals(allowed, normalizedOrigin, StringComparison.OrdinalIgnoreCase));

        if (!isAllowed)
        {
            context.Result = new ForbidResult();
            return;
        }

        await next();
    }
}
