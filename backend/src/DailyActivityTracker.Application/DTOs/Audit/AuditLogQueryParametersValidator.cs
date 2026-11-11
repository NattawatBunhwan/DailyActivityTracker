using FluentValidation;

namespace DailyActivityTracker.Application.DTOs.Audit;

public class AuditLogQueryParametersValidator : AbstractValidator<AuditLogQueryParameters>
{
    public AuditLogQueryParametersValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThan(0)
            .WithMessage("Page must be greater than 0.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("PageSize must be between 1 and 100.");

        RuleFor(x => x.Category)
            .IsInEnum()
            .When(x => x.Category.HasValue)
            .WithMessage("Category must be a valid AuditCategory.");

        RuleFor(x => x.Action)
            .MaximumLength(64)
            .WithMessage("Action cannot exceed 64 characters.");

        RuleFor(x => x.From)
            .Custom((fromVal, context) =>
            {
                if (!string.IsNullOrWhiteSpace(fromVal) &&
                    !AuditLogQueryParameters.TryParseUtcBoundary(fromVal, isUpperBound: false, out _, out _, out var error))
                {
                    context.AddFailure(nameof(AuditLogQueryParameters.From), error);
                }
            });

        RuleFor(x => x.To)
            .Custom((toVal, context) =>
            {
                if (!string.IsNullOrWhiteSpace(toVal) &&
                    !AuditLogQueryParameters.TryParseUtcBoundary(toVal, isUpperBound: true, out _, out _, out var error))
                {
                    context.AddFailure(nameof(AuditLogQueryParameters.To), error);
                }
            });

        RuleFor(x => x)
            .Custom((query, context) =>
            {
                if (string.IsNullOrWhiteSpace(query.From) || string.IsNullOrWhiteSpace(query.To))
                {
                    return;
                }

                if (AuditLogQueryParameters.TryParseUtcBoundary(query.From, isUpperBound: false, out var fromUtc, out _, out _) &&
                    AuditLogQueryParameters.TryParseUtcBoundary(query.To, isUpperBound: true, out var toUtc, out var isExclusiveTo, out _) &&
                    fromUtc.HasValue && toUtc.HasValue)
                {
                    // If toUtc is exclusive (next day 00:00:00), fromUtc must be strictly < toUtc
                    // If toUtc is inclusive (exact timestamp), fromUtc must be <= toUtc
                    var isInvalid = isExclusiveTo
                        ? fromUtc.Value >= toUtc.Value
                        : fromUtc.Value > toUtc.Value;

                    if (isInvalid)
                    {
                        context.AddFailure("DateRange", "'From' date must be earlier than or equal to 'To' date.");
                    }
                }
            });
    }
}
