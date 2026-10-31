using DailyActivityTracker.Application.Common;

namespace DailyActivityTracker.Tests;

public class CorsSettingsValidatorTests
{
    [Fact]
    public void ValidateAllowedOrigins_WhenNull_ThrowsInvalidOperationException()
    {
        string[]? origins = null;

        var ex = Assert.Throws<InvalidOperationException>(() =>
            CorsSettingsValidator.ValidateAllowedOrigins(origins));

        Assert.Contains("Cors:AllowedOrigins", ex.Message);
        Assert.Contains("missing or empty", ex.Message);
    }

    [Fact]
    public void ValidateAllowedOrigins_WhenEmpty_ThrowsInvalidOperationException()
    {
        var origins = Array.Empty<string>();

        var ex = Assert.Throws<InvalidOperationException>(() =>
            CorsSettingsValidator.ValidateAllowedOrigins(origins));

        Assert.Contains("Cors:AllowedOrigins", ex.Message);
        Assert.Contains("missing or empty", ex.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidateAllowedOrigins_WhenContainsEmptyOrWhitespace_ThrowsInvalidOperationException(string emptyEntry)
    {
        var origins = new[] { "http://localhost:5173", emptyEntry };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            CorsSettingsValidator.ValidateAllowedOrigins(origins));

        Assert.Contains("Cors:AllowedOrigins", ex.Message);
        Assert.Contains("empty or whitespace-only", ex.Message);
    }

    [Fact]
    public void ValidateAllowedOrigins_WhenContainsWildcard_ThrowsInvalidOperationException()
    {
        var origins = new[] { "*" };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            CorsSettingsValidator.ValidateAllowedOrigins(origins));

        Assert.Contains("Wildcard '*' is not permitted", ex.Message);
    }

    [Theory]
    [InlineData("not-a-url")]
    [InlineData("ftp://localhost:5173")]
    [InlineData("file:///path")]
    public void ValidateAllowedOrigins_WhenInvalidSchemeOrUrl_ThrowsInvalidOperationException(string invalidOrigin)
    {
        var origins = new[] { invalidOrigin };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            CorsSettingsValidator.ValidateAllowedOrigins(origins));

        Assert.Contains("not a valid absolute HTTP or HTTPS URL", ex.Message);
    }

    [Theory]
    [InlineData("http://localhost:5173/api")]
    [InlineData("https://example.com/subpath/")]
    public void ValidateAllowedOrigins_WhenContainsPath_ThrowsInvalidOperationException(string originWithPath)
    {
        var origins = new[] { originWithPath };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            CorsSettingsValidator.ValidateAllowedOrigins(origins));

        Assert.Contains("must not contain a path component", ex.Message);
    }

    [Theory]
    [InlineData("http://localhost:5173?query=1")]
    [InlineData("https://example.com#section")]
    public void ValidateAllowedOrigins_WhenContainsQueryOrFragment_ThrowsInvalidOperationException(string originWithQuery)
    {
        var origins = new[] { originWithQuery };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            CorsSettingsValidator.ValidateAllowedOrigins(origins));

        Assert.Contains("must not contain query parameters or fragments", ex.Message);
    }

    [Fact]
    public void ValidateAllowedOrigins_WhenValidSingleOrigin_ReturnsNormalizedOrigin()
    {
        var origins = new[] { "http://localhost:5173" };

        var result = CorsSettingsValidator.ValidateAllowedOrigins(origins);

        Assert.Single(result);
        Assert.Equal("http://localhost:5173", result[0]);
    }

    [Fact]
    public void ValidateAllowedOrigins_WhenValidMultipleOrigins_ReturnsNormalizedOrigins()
    {
        var origins = new[] { "http://localhost:5173", "https://app.dailyactivitytracker.com" };

        var result = CorsSettingsValidator.ValidateAllowedOrigins(origins);

        Assert.Equal(2, result.Length);
        Assert.Equal("http://localhost:5173", result[0]);
        Assert.Equal("https://app.dailyactivitytracker.com", result[1]);
    }

    [Fact]
    public void ValidateAllowedOrigins_WhenOriginHasTrailingSlash_NormalizesWithoutTrailingSlash()
    {
        var origins = new[] { "http://localhost:5173/" };

        var result = CorsSettingsValidator.ValidateAllowedOrigins(origins);

        Assert.Single(result);
        Assert.Equal("http://localhost:5173", result[0]);
    }

    [Fact]
    public void ValidateAllowedOrigins_WhenDuplicatesExist_ReturnsDistinctOrigins()
    {
        var origins = new[] { "http://localhost:5173", "http://localhost:5173/" };

        var result = CorsSettingsValidator.ValidateAllowedOrigins(origins);

        Assert.Single(result);
        Assert.Equal("http://localhost:5173", result[0]);
    }
}

