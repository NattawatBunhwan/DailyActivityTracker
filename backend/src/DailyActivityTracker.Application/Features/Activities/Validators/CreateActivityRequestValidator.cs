using DailyActivityTracker.Application.Features.Activities.DTOs;
using FluentValidation;

namespace DailyActivityTracker.Application.Features.Activities.Validators;

public class CreateActivityRequestValidator : AbstractValidator<CreateActivityRequest>
{
    public CreateActivityRequestValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.ActivityDate).NotEmpty();
    }
}
