# Audit logging backend opzet

De frontend stuurt logs als POST naar:
- /api/audit-logs

Payload (JSON):
- actor: string
- action: string
- target: string
- metadata: string | null (JSON string)
- occurredAtUtc: string (ISO datetime)
- page: string | null
- userAgent: string | null

## Aanbevolen backend flow (ASP.NET Core)

1. Maak endpoint POST /api/audit-logs.
2. Lees user identity uit JWT (fallback op actor uit payload).
3. Voeg Request IP toe.
4. Schrijf record naar tabel dbo.UserActionLogs.

## Voorbeeldmodel

```csharp
public sealed class AuditLogRequest
{
    public string Actor { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string? Metadata { get; set; }
    public string? Page { get; set; }
    public string? UserAgent { get; set; }
    public DateTime OccurredAtUtc { get; set; }
}
```

## Voorbeeld endpoint (minimaal)

```csharp
app.MapPost("/api/audit-logs", async (
    AuditLogRequest request,
    HttpContext http,
    ILogger<Program> logger,
    YourDbContext db) =>
{
    var actorFromToken = http.User?.Identity?.Name;

    db.UserActionLogs.Add(new UserActionLog
    {
        Actor = string.IsNullOrWhiteSpace(actorFromToken) ? request.Actor : actorFromToken,
        Action = request.Action,
        Target = request.Target,
        Metadata = request.Metadata,
        Page = request.Page,
        UserAgent = request.UserAgent,
        IpAddress = http.Connection.RemoteIpAddress?.ToString(),
        OccurredAtUtc = request.OccurredAtUtc == default ? DateTime.UtcNow : request.OccurredAtUtc,
        CreatedAtUtc = DateTime.UtcNow,
    });

    await db.SaveChangesAsync();
    return Results.Ok();
}).RequireAuthorization();
```

## Connection string voorbeeld

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=Codecobra;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True"
  }
}
```

Gebruik dezelfde connection in je bestaande DbContext/Identity configuratie.
