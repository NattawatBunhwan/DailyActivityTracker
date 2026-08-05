using DailyActivityTracker.Domain.Entities;

namespace DailyActivityTracker.Application.Interfaces.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    
    Task<User?> GetByEmailAsync(string email,CancellationToken cancellationToken = default);

    Task<List<User>> GetAllAsync(CancellationToken cancellationToken = default);

    Task AddAsync(User user, CancellationToken cancellationToken = default);

    Task UpdateAsync(User user, CancellationToken cancellationToken = default);

    Task DeleteAsync(User user, CancellationToken cancellationToken = default);
}
