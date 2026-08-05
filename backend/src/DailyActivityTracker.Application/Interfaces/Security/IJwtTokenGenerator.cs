using DailyActivityTracker.Domain.Entities;

namespace DailyActivityTracker.Application.Interfaces.Security;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user); 
}
