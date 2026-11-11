using DailyActivityTracker.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DailyActivityTracker.Infrastructure.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs");

        builder.HasKey(auditLog => auditLog.Id);

        builder.Property(auditLog => auditLog.Id)
            .ValueGeneratedNever();

        builder.Property(auditLog => auditLog.TimestampUtc)
            .IsRequired();

        builder.Property(auditLog => auditLog.Category)
            .IsRequired();

        builder.Property(auditLog => auditLog.Action)
            .IsRequired()
            .HasMaxLength(64);

        builder.Property(auditLog => auditLog.ActorEmail)
            .HasMaxLength(256);

        builder.Property(auditLog => auditLog.ActorRole)
            .HasMaxLength(64);

        builder.Property(auditLog => auditLog.EntityName)
            .HasMaxLength(128);

        builder.Property(auditLog => auditLog.EntityId)
            .HasMaxLength(128);

        builder.Property(auditLog => auditLog.OldValues)
            .HasColumnType("jsonb");

        builder.Property(auditLog => auditLog.NewValues)
            .HasColumnType("jsonb");

        builder.Property(auditLog => auditLog.Metadata)
            .HasColumnType("jsonb");

        builder.Property(auditLog => auditLog.CorrelationId)
            .HasMaxLength(64);

        builder.Property(auditLog => auditLog.IpAddress)
            .HasMaxLength(45);

        builder.HasOne(auditLog => auditLog.User)
            .WithMany()
            .HasForeignKey(auditLog => auditLog.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(auditLog => auditLog.TimestampUtc)
            .HasDatabaseName("IX_audit_logs_TimestampUtc");

        builder.HasIndex(auditLog => new { auditLog.UserId, auditLog.TimestampUtc })
            .HasDatabaseName("IX_audit_logs_UserId_TimestampUtc");

        builder.HasIndex(auditLog => new { auditLog.EntityName, auditLog.EntityId, auditLog.TimestampUtc })
            .HasDatabaseName("IX_audit_logs_EntityName_EntityId_TimestampUtc");

        builder.HasIndex(auditLog => new { auditLog.Action, auditLog.TimestampUtc })
            .HasDatabaseName("IX_audit_logs_Action_TimestampUtc");
    }
}
