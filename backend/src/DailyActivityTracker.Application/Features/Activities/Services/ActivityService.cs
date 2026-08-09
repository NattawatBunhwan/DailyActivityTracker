using DailyActivityTracker.Application.Exceptions;
using DailyActivityTracker.Application.Features.Activities.DTOs;
using DailyActivityTracker.Application.Interfaces.Repositories;
using DailyActivityTracker.Domain.Entities;

namespace DailyActivityTracker.Application.Features.Activities.Services;

public class ActivityService : IActivityService
{
    private readonly IActivityRepository _activityRepository;
    private readonly IUserRepository _userRepository;

    public ActivityService(IActivityRepository activityRepository, IUserRepository userRepository)
    {
        _activityRepository = activityRepository;
        _userRepository = userRepository;
    }

    public async Task<ActivityResponse> CreateAsync(Guid userId, CreateActivityRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            throw new UserNotFoundException($"User with id {userId} was not found.");
        }
        
        var activity = new Activity
        {
            UserId = userId,
            Title = request.Title,
            Description = request.Description,
            ActivityDate = DateTime.SpecifyKind(request.ActivityDate, DateTimeKind.Utc),
            Status = request.Status,
            Priority = request.Priority
        };

        await _activityRepository.AddAsync(activity, cancellationToken);

        return MapToResponse(activity);
    }

    public async Task<List<ActivityResponse>> GetAllAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var activities = await _activityRepository.GetAllByUserIdAsync(userId, cancellationToken);

        return activities.Select(MapToResponse).ToList();
    }

    public async Task<ActivityResponse?> GetByIdAsync(Guid activityId, Guid userId, CancellationToken cancellationToken = default)
    {
        var activity = await _activityRepository.GetByIdAndUserIdAsync(activityId, userId, cancellationToken);

        return activity is null ? null : MapToResponse(activity);
    }

    public async Task<ActivityResponse?> UpdateAsync(Guid activityId, Guid userId, UpdateActivityRequest request, CancellationToken cancellationToken = default)
    {
        var activity = await _activityRepository.GetByIdAndUserIdAsync(activityId, userId, cancellationToken);

        if (activity is null)
        {
            return null;
        }

        activity.Title = request.Title;
        activity.Description = request.Description;
        activity.ActivityDate = request.ActivityDate;
        activity.Status = request.Status;
        activity.Priority = request.Priority;

        await _activityRepository.UpdateAsync(activity, cancellationToken);

        return MapToResponse(activity);
    }

    public async Task<bool> DeleteAsync(Guid activityId, Guid userId, CancellationToken cancellationToken = default)
    {
        var activity = await _activityRepository.GetByIdAndUserIdAsync(activityId, userId, cancellationToken);

        if (activity is null)
        {
            return false;
        }

        await _activityRepository.DeleteAsync(activity, cancellationToken);

        return true;
    }

    private static ActivityResponse MapToResponse(Activity activity)
    {
        return new ActivityResponse
        {
            Id = activity.Id,
            UserId = activity.UserId,
            Title = activity.Title,
            Description = activity.Description,
            ActivityDate = activity.ActivityDate,
            Status = activity.Status,
            Priority = activity.Priority
        };
    }
}
