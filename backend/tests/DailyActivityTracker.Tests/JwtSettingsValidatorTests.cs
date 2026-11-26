using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Domain.Entities;
using DailyActivityTracker.Infrastructure.Security;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DailyActivityTracker.Tests;

public class JwtSettingsValidatorTests
{
    private const string TestSecretKey = "test_only_signing_key_with_at_least_32_bytes_for_hmac_sha256";
    private const string ExpectedIssuer = "https://api.example.com";
    private const string ExpectedAudience = "urn:dailyactivitytracker:api";
    [Fact]
    public void ValidateSecretKey_WhenSecretKeyIsNull_ThrowsInvalidOperationException()
    {
        // Arrange
        string? secretKey = null;

        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() =>
            JwtSettingsValidator.ValidateSecretKey(secretKey));

        Assert.Contains("JwtSettings:SecretKey", exception.Message);
        Assert.Contains("missing or empty", exception.Message);
        Assert.Contains("dotnet user-secrets", exception.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("   \t  \r\n ")]
    public void ValidateSecretKey_WhenSecretKeyIsEmptyOrWhitespace_ThrowsInvalidOperationException(string whitespaceKey)
    {
        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() =>
            JwtSettingsValidator.ValidateSecretKey(whitespaceKey));

        Assert.Contains("JwtSettings:SecretKey", exception.Message);
        Assert.Contains("missing or empty", exception.Message);
        Assert.Contains("dotnet user-secrets", exception.Message);
    }

    [Theory]
    [InlineData("short")]
    [InlineData("1234567890123456789012345678901")] // 31 ASCII characters = 31 bytes
    public void ValidateSecretKey_WhenSecretKeyIsShorterThan32Bytes_ThrowsInvalidOperationException(string shortKey)
    {
        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() =>
            JwtSettingsValidator.ValidateSecretKey(shortKey));

        Assert.Contains("JwtSettings:SecretKey", exception.Message);
        Assert.Contains("at least 32 UTF-8 bytes (256 bits)", exception.Message);
        Assert.Contains("HMAC-SHA256", exception.Message);
        Assert.Contains("dotnet user-secrets", exception.Message);
    }

    [Fact]
    public void ValidateSecretKey_WhenValidKeyWithAtLeast32Bytes_ReturnsKey()
    {
        // Arrange (exactly 32 bytes)
        var validKey = "12345678901234567890123456789012";

        // Act
        var result = JwtSettingsValidator.ValidateSecretKey(validKey);

        // Assert
        Assert.Equal(validKey, result);
    }

    [Fact]
    public void ValidateSecretKey_WhenValidKeyLongerThan32Bytes_ReturnsKey()
    {
        // Arrange (64 characters)
        var longKey = "a_very_long_secure_secret_key_that_exceeds_32_bytes_and_is_safe_to_use_for_jwt";

        // Act
        var result = JwtSettingsValidator.ValidateSecretKey(longKey);

        // Assert
        Assert.Equal(longKey, result);
    }

    [Fact]
    public void ValidateSecretKey_WhenMultibyteUtf8CharactersMeet32Bytes_ReturnsKey()
    {
        // Arrange: 11 characters * 3 bytes each = 33 UTF-8 bytes
        var multibyteKey = "ความลับความลับ"; // 14 Thai characters, > 32 bytes in UTF-8

        // Act
        var result = JwtSettingsValidator.ValidateSecretKey(multibyteKey);

        // Assert
        Assert.Equal(multibyteKey, result);
    }

    [Fact]
    public void GenerateToken_WhenIssuerAndAudienceMatchValidationParameters_SucceedsAndPreservesClaims()
    {
        // Arrange
        var generator = CreateTokenGenerator(
            issuer: ExpectedIssuer,
            audience: ExpectedAudience,
            expirationMinutes: 15);
        var user = CreateTestUser();
        var validationParameters = CreateValidationParameters(
            validIssuer: ExpectedIssuer,
            validAudience: ExpectedAudience);
        var tokenHandler = new JwtSecurityTokenHandler();

        // Act
        var tokenResult = generator.GenerateToken(user);
        var principal = tokenHandler.ValidateToken(tokenResult.Token, validationParameters, out var validatedToken);

        // Assert
        Assert.NotNull(principal);
        Assert.NotNull(validatedToken);
        Assert.Equal(user.Id.ToString(), principal.FindFirstValue(ClaimTypes.NameIdentifier));
        Assert.Equal(user.Email, principal.FindFirstValue(ClaimTypes.Email));
        Assert.Equal(user.Role, principal.FindFirstValue(ClaimTypes.Role));
    }

    [Fact]
    public void ValidateToken_WhenTokenHasIncorrectIssuer_ThrowsSecurityTokenInvalidIssuerException()
    {
        // Arrange
        var generator = CreateTokenGenerator(
            issuer: "https://untrusted-issuer.example.com",
            audience: ExpectedAudience,
            expirationMinutes: 15);
        var user = CreateTestUser();
        var validationParameters = CreateValidationParameters(
            validIssuer: ExpectedIssuer,
            validAudience: ExpectedAudience);
        var tokenHandler = new JwtSecurityTokenHandler();
        var tokenResult = generator.GenerateToken(user);

        // Act & Assert
        Assert.Throws<SecurityTokenInvalidIssuerException>(() =>
            tokenHandler.ValidateToken(tokenResult.Token, validationParameters, out _));
    }

    [Fact]
    public void ValidateToken_WhenTokenHasIncorrectAudience_ThrowsSecurityTokenInvalidAudienceException()
    {
        // Arrange
        var generator = CreateTokenGenerator(
            issuer: ExpectedIssuer,
            audience: "https://wrong-audience.example.com",
            expirationMinutes: 15);
        var user = CreateTestUser();
        var validationParameters = CreateValidationParameters(
            validIssuer: ExpectedIssuer,
            validAudience: ExpectedAudience);
        var tokenHandler = new JwtSecurityTokenHandler();
        var tokenResult = generator.GenerateToken(user);

        // Act & Assert
        Assert.Throws<SecurityTokenInvalidAudienceException>(() =>
            tokenHandler.ValidateToken(tokenResult.Token, validationParameters, out _));
    }

    [Fact]
    public void ValidateToken_WhenTokenIsExpired_ThrowsSecurityTokenExpiredException()
    {
        // Arrange
        var generator = CreateTokenGenerator(
            issuer: ExpectedIssuer,
            audience: ExpectedAudience,
            expirationMinutes: -10);
        var user = CreateTestUser();
        var validationParameters = CreateValidationParameters(
            validIssuer: ExpectedIssuer,
            validAudience: ExpectedAudience);
        var tokenHandler = new JwtSecurityTokenHandler();
        var tokenResult = generator.GenerateToken(user);

        // Act & Assert
        Assert.Throws<SecurityTokenExpiredException>(() =>
            tokenHandler.ValidateToken(tokenResult.Token, validationParameters, out _));
    }

    private static JwtTokenGenerator CreateTokenGenerator(string issuer, string audience, int expirationMinutes)
    {
        var settings = Options.Create(new JwtSettings
        {
            SecretKey = TestSecretKey,
            Issuer = issuer,
            Audience = audience,
            ExpirationMinutes = expirationMinutes
        });

        return new JwtTokenGenerator(settings);
    }

    private static TokenValidationParameters CreateValidationParameters(string validIssuer, string validAudience)
    {
        return new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = validIssuer,

            ValidateAudience = true,
            ValidAudience = validAudience,

            ValidateLifetime = true,

            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(TestSecretKey))
        };
    }

    private static User CreateTestUser()
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = "user@example.com",
            Role = "User"
        };
    }
}

