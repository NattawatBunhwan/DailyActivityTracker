using DailyActivityTracker.Application.Features.Users.DTOs;
using FluentValidation;

namespace DailyActivityTracker.Application.Features.Users.Validators;

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(100);
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Age).InclusiveBetween(1, 150);
        RuleFor(x => x.Occupation).NotEmpty().MaximumLength(100);
    }
}
