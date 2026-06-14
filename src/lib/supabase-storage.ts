import "server-only";

import {
  TEAM_REGISTRATION_PLAYER_DOCUMENT_ALLOWED_MIME_TYPES,
  getTeamRegistrationPlayerDocumentValidationError,
} from "@/features/team-registrations/utils/team-registration-player-documents";

type UploadPrivateBucketObjectInput = {
  bucketName: string;
  objectPath: string;
  body: ArrayBuffer;
  contentType: string;
};

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getSupabaseStorageBaseUrl() {
  return `${readRequiredEnv("SUPABASE_URL").replace(/\/$/, "")}/storage/v1`;
}

function getSupabaseServiceRoleKey() {
  return readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function encodeStoragePath(objectPath: string) {
  return objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function sanitizeFileName(value: string) {
  const trimmed = value.trim();
  const sanitized = trimmed
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();

  return sanitized.length > 0 ? sanitized.slice(0, 120) : "document";
}

export function getSupabaseTeamDocumentsBucketName() {
  return readRequiredEnv("SUPABASE_TEAM_DOCUMENTS_BUCKET");
}

export function isAllowedTeamRegistrationPlayerDocumentMimeType(mimeType: string) {
  return TEAM_REGISTRATION_PLAYER_DOCUMENT_ALLOWED_MIME_TYPES.includes(
    mimeType as (typeof TEAM_REGISTRATION_PLAYER_DOCUMENT_ALLOWED_MIME_TYPES)[number],
  );
}

export function validateTeamRegistrationPlayerDocumentFile(file: File) {
  return getTeamRegistrationPlayerDocumentValidationError(file);
}

export function buildTeamRegistrationPlayerDocumentPath(args: {
  registrationId: string;
  playerId: string;
  originalFileName: string;
}) {
  const safeFileName = sanitizeFileName(args.originalFileName);

  return `team-registrations/${args.registrationId}/players/${args.playerId}/${Date.now()}-${safeFileName}`;
}

export function buildTeamRegistrationGdprDocumentPath(args: {
  registrationId: string;
  originalFileName: string;
}) {
  const safeFileName = sanitizeFileName(args.originalFileName);

  return `team-registrations/${args.registrationId}/gdpr/${Date.now()}-${safeFileName}`;
}

export async function uploadPrivateBucketObject({
  bucketName,
  objectPath,
  body,
  contentType,
}: UploadPrivateBucketObjectInput) {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const response = await fetch(
    `${getSupabaseStorageBaseUrl()}/object/${encodeURIComponent(bucketName)}/${encodeStoragePath(objectPath)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Supabase Storage upload failed (${response.status}): ${responseText || "empty response"}`,
    );
  }
}

export async function deletePrivateBucketObject(bucketName: string, objectPath: string) {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const response = await fetch(
    `${getSupabaseStorageBaseUrl()}/object/${encodeURIComponent(bucketName)}/${encodeStoragePath(objectPath)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      cache: "no-store",
    },
  );

  if (!response.ok && response.status !== 404) {
    const responseText = await response.text();

    throw new Error(
      `Supabase Storage delete failed (${response.status}): ${responseText || "empty response"}`,
    );
  }
}
