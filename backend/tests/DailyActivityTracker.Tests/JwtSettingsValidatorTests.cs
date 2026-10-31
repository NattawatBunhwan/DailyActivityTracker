using DailyActivityTracker.Application.Common;

namespace DailyActivityTracker.Tests;

public class JwtSettingsValidatorTests
{
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
}

