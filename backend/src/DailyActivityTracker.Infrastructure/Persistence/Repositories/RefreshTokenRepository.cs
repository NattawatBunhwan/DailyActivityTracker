using DailyActivityTracker.Application.Interfaces.Repositories;
using DailyActivityTracker.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DailyActivityTracker.Infrastructure.Persistence.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly ApplicationDbContext _context;

    public RefreshTokenRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default)
    {
        await _context.RefreshTokens.AddAsync(refreshToken, cancellationToken);
    }

    public Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        return _context.RefreshTokens.FirstOrDefaultAsync(refreshtoken => refreshtoken.Token == token, cancellationToken);
    }

    public async Task<bool> TryRevokeAndRotateAsync(string oldToken, RefreshToken newToken, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        if (_context.Database.IsNpgsql() || _context.Database.IsRelational())
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var affected = await _context.RefreshTokens
                    .Where(t => t.Token == oldToken && !t.IsRevoked && t.ExpiresAt > now)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(t => t.IsRevoked, true)
                        .SetProperty(t => t.UpdatedAt, now),
                        cancellationToken);

                if (affected != 1)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return false;
                }

                await _context.RefreshTokens.AddAsync(newToken, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return true;
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
        else
        {
            // Fallback for non-relational test providers (e.g. EF InMemory)
            var existing = await _context.RefreshTokens
                .FirstOrDefaultAsync(t => t.Token == oldToken, cancellationToken);

            if (existing == null || existing.IsRevoked || existing.ExpiresAt <= now)
            {
                return false;
            }

            existing.IsRevoked = true;
            await _context.RefreshTokens.AddAsync(newToken, cancellationToken);

            try
            {
                await _context.SaveChangesAsync(cancellationToken);
                return true;
            }
            catch (DbUpdateConcurrencyException)
            {
                return false;
            }
        }
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }
}
