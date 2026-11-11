namespace DailyActivityTracker.Application.DTOs.Audit;

public class AuditUserOptionResponse
{
    public Guid UserId { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? Role { get; set; }
    public bool IsDeleted { get; set; }
}

public class AuditFilterOptionsResponse
{
    public List<string> Actions { get; set; } = [];
    public List<AuditUserOptionResponse> Users { get; set; } = [];
}

public class AuditFilterOptionsQueryParameters
{
    public Domain.Enums.AuditCategory? Category { get; set; }
    public string? Action { get; set; }
}
