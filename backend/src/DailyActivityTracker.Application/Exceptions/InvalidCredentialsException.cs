namespace DailyActivityTracker.Application.Exceptions;

public class InvalidCredentialsException : UnauthorizedException
{
    public InvalidCredentialsException() : base("Invalid email or password.")
    {
    }
}