import { getAuthHeaders } from "./authApi";

export interface AuditLogInput {
  actor: string;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
}

interface AuditLogPayload {
  actor: string;
  action: string;
  target: string;
  metadata: string | null;
  occurredAtUtc: string;
  page: string | null;
  userAgent: string | null;
}

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:5018/api";
const AUDIT_LOG_ENDPOINT =
  (import.meta as any).env?.VITE_AUDIT_LOG_ENDPOINT ??
  `${API_BASE_URL.replace(/\/$/, "")}/audit-logs`;
const AUDIT_QUEUE_KEY = "pending-audit-logs";

function safeParseQueue(value: string | null): AuditLogPayload[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadQueue(): AuditLogPayload[] {
  if (typeof window === "undefined") {
    return [];
  }

  return safeParseQueue(window.localStorage.getItem(AUDIT_QUEUE_KEY));
}

function saveQueue(queue: AuditLogPayload[]) {
  if (typeof window === "undefined") {
    return;
  }

  const trimmed = queue.slice(-200);
  window.localStorage.setItem(AUDIT_QUEUE_KEY, JSON.stringify(trimmed));
}

function enqueue(payload: AuditLogPayload) {
  const queue = loadQueue();
  queue.push(payload);
  saveQueue(queue);
}

async function postAuditLog(payload: AuditLogPayload) {
  const response = await fetch(AUDIT_LOG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to store audit log: ${response.status}`);
  }
}

function buildPayload(input: AuditLogInput): AuditLogPayload {
  const metadata = input.metadata ?? {};

  return {
    actor: input.actor,
    action: input.action,
    target: input.target,
    metadata: Object.keys(metadata).length ? JSON.stringify(metadata) : null,
    occurredAtUtc: new Date().toISOString(),
    page:
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : null,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : null,
  };
}

export async function flushPendingAuditLogs() {
  const queue = loadQueue();

  if (!queue.length) {
    return;
  }

  const failed: AuditLogPayload[] = [];

  for (const item of queue) {
    try {
      await postAuditLog(item);
    } catch {
      failed.push(item);
    }
  }

  saveQueue(failed);
}

export async function logUserAction(input: AuditLogInput) {
  const payload = buildPayload(input);

  try {
    await postAuditLog(payload);
  } catch {
    enqueue(payload);
  }
}
