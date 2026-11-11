using System.Text.Json;
using DailyActivityTracker.Application.DTOs;
using DailyActivityTracker.Application.Exceptions;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(
        RequestDelegate next, 
        ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            int statusCode;

            switch (ex)
            {
                case UnauthorizedException:
                    statusCode = StatusCodes.Status401Unauthorized;
                    _logger.LogWarning(
                        ex,
                        "Unauthorized while processing {Method} {Path}",
                        context.Request.Method,
                        context.Request.Path
                    );
                    break;

                case NotFoundException :
                    statusCode = StatusCodes.Status404NotFound;
                    _logger.LogWarning(
                        ex,
                        "Resource not found while processing {Method} {Path}",
                        context.Request.Method,
                        context.Request.Path
                    );
                    break;

                case ConflictException:
                    statusCode = StatusCodes.Status409Conflict;
                    _logger.LogWarning(
                        ex,
                        "Conflict while processing {Method} {Path}",
                        context.Request.Method,
                        context.Request.Path
                    );
                    break;

                default:
                    statusCode = StatusCodes.Status500InternalServerError;
                    _logger.LogError(
                        ex,
                        "Unhandled exception while processing {Method} {Path}",
                        context.Request.Method,
                        context.Request.Path
                    );
                    break;
            }

            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json";

            var response = new ErrorResponse
            {
                StatusCode = statusCode,
                Message = statusCode == StatusCodes.Status500InternalServerError
                            ? "An unexpected error occurred." : ex.Message,
                Timestamp = DateTime.UtcNow
            };

            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            string json = JsonSerializer.Serialize(response, options);
            await context.Response.WriteAsync(json);
        }
    }
}