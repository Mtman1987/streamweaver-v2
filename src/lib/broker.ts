import { getOrCreateInstallIdentity } from "@/lib/install-identity";

function normalizeBaseUrl(value: string): string {
  // Remove trailing slashes for consistent URL joining.
  return value.replace(/\/+$/, "");
}

export function getBrokerBaseUrl(): string | undefined {
  const raw = process.env.BROKER_BASE_URL || process.env.STREAMWEAVER_BROKER_BASE_URL;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return normalizeBaseUrl(trimmed);
}

export function isBrokerEnabled(): boolean {
  return Boolean(getBrokerBaseUrl());
}

export async function getBrokerAuthHeaders(): Promise<Record<string, string>> {
  const { installId, installSecret } = await getOrCreateInstallIdentity();
  return {
    "x-streamweaver-install-id": installId,
    "x-streamweaver-install-secret": installSecret,
  };
}

export function joinBrokerUrl(baseUrl: string, path: string): string {
  if (path.startsWith("/")) return `${baseUrl}${path}`;
  return `${baseUrl}/${path}`;
}
