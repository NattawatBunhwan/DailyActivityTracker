namespace DailyActivityTracker.Application.Exceptions;

public class UserNotFoundException : NotFoundException
{
    public UserNotFoundException() : base("User not found.")
    {
    }

    public UserNotFoundException(Guid id) : base($"User with id {id} was not found.")
    {
    }

    public UserNotFoundException(string message) : base(message)
    {
    }
}