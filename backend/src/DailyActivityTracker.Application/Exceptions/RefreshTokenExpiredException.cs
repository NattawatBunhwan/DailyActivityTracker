namespace DailyActivityTracker.Application.Exceptions;

public class RefreshTokenExpiredException : UnauthorizedException
{
    public RefreshTokenExpiredException() : base("Refresh token is invalid or expired.")
    {
        
    }
}