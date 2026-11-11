using DailyActivityTracker.Application.Common;
using DailyActivityTracker.Domain.Entities;

namespace DailyActivityTracker.Application.Interfaces.Security;

public interface IJwtTokenGenerator
{
    TokenResult GenerateToken(User user); 
}
