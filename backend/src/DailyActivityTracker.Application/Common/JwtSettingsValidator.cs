using System.Text;

namespace DailyActivityTracker.Application.Common;

public static class JwtSettingsValidator
{
    public const int MinimumKeySizeBytes = 32;

    public static string ValidateSecretKey(string? secretKey)
    {
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException(
                "Configuration error: 'JwtSettings:SecretKey' is missing or empty. " +
                "For local development, configure it using .NET User Secrets: " +
                "dotnet user-secrets set \"JwtSettings:SecretKey\" \"<your-secret-key>\" --project backend/src/DailyActivityTracker.Api");
        }

        if (Encoding.UTF8.GetByteCount(secretKey) < MinimumKeySizeBytes)
        {
            throw new InvalidOperationException(
                $"Configuration error: 'JwtSettings:SecretKey' must be at least {MinimumKeySizeBytes} UTF-8 bytes (256 bits) for HMAC-SHA256 signing. " +
                "For local development, configure a sufficiently long secret using .NET User Secrets: " +
                "dotnet user-secrets set \"JwtSettings:SecretKey\" \"<your-secret-key>\" --project backend/src/DailyActivityTracker.Api");
        }

        return secretKey;
    }
}

