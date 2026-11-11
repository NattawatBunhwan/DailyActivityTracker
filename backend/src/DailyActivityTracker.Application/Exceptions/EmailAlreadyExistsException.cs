namespace DailyActivityTracker.Application.Exceptions;

public class EmailAlreadyExistsException : ConflictException
{
    public EmailAlreadyExistsException(string email) : base($"Email '{email}' is already in use.")
    {
    }

}