using DailyActivityTracker.Application.Features.Activities.DTOs;
using FluentValidation;

namespace DailyActivityTracker.Application.Features.Activities.Validators;

public class ActivityQueryParametersValidator : AbstractValidator<ActivityQueryParameters>
{
    public ActivityQueryParametersValidator()
    {
        RuleFor(x => x.Page).GreaterThan(0);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x.Search).MaximumLength(100);
    }
}