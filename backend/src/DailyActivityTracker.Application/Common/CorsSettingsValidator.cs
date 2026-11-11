namespace DailyActivityTracker.Application.Common;

public static class CorsSettingsValidator
{
    public static string[] ValidateAllowedOrigins(string[]? origins)
    {
        if (origins == null || origins.Length == 0)
        {
            throw new InvalidOperationException(
                "Configuration error: 'Cors:AllowedOrigins' is missing or empty. " +
                "Configure at least one valid frontend origin (e.g. 'http://localhost:5173') in appsettings.Development.json " +
                "or via the 'Cors__AllowedOrigins__0' environment variable for production.");
        }

        var validatedOrigins = new List<string>();

        foreach (var rawOrigin in origins)
        {
            if (string.IsNullOrWhiteSpace(rawOrigin))
            {
                throw new InvalidOperationException(
                    "Configuration error: 'Cors:AllowedOrigins' contains an empty or whitespace-only entry.");
            }

            var origin = rawOrigin.Trim();

            if (origin == "*")
            {
                throw new InvalidOperationException(
                    "Configuration error: Wildcard '*' is not permitted in 'Cors:AllowedOrigins'. " +
                    "Specify explicit origins (e.g. 'http://localhost:5173').");
            }

            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                throw new InvalidOperationException(
                    $"Configuration error: Origin '{origin}' in 'Cors:AllowedOrigins' is not a valid absolute HTTP or HTTPS URL.");
            }

            if (uri.AbsolutePath != "/")
            {
                throw new InvalidOperationException(
                    $"Configuration error: Origin '{origin}' in 'Cors:AllowedOrigins' must not contain a path component.");
            }

            if (!string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment))
            {
                throw new InvalidOperationException(
                    $"Configuration error: Origin '{origin}' in 'Cors:AllowedOrigins' must not contain query parameters or fragments.");
            }

            // An origin is scheme://host[:port] without trailing slash
            var normalizedOrigin = $"{uri.Scheme}://{uri.Authority}";
            validatedOrigins.Add(normalizedOrigin);
        }

        return validatedOrigins.Distinct().ToArray();
    }
}

