-- Run this in Supabase → SQL Editor, then reload the app.

CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "DocumentVisibility" AS ENUM ('ALL_EMPLOYEES', 'DEPARTMENTS');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE "AuditEvent" AS ENUM ('USER_LOGIN', 'DOCUMENT_UPLOAD', 'DOCUMENT_DELETE', 'USER_CREATED', 'USER_UPDATED', 'AI_QUERY');

CREATE TABLE "Company" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("companyId", "email")
);

CREATE TABLE "Department" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("companyId", "name")
);

CREATE TABLE "UserDepartment" (
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "departmentId" TEXT NOT NULL REFERENCES "Department"("id") ON DELETE CASCADE,
    PRIMARY KEY ("userId", "departmentId")
);

CREATE TABLE "Document" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "uploadedById" TEXT NOT NULL REFERENCES "User"("id"),
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'DEPARTMENTS',
    "errorMessage" TEXT,
    "pageCount" INTEGER,
    "chunkCount" INTEGER,
    "extractedChars" INTEGER,
    "processedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "DocumentDepartment" (
    "documentId" TEXT NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE,
    "departmentId" TEXT NOT NULL REFERENCES "Department"("id") ON DELETE CASCADE,
    PRIMARY KEY ("documentId", "departmentId")
);

CREATE TABLE "Conversation" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Message" (
    "id" TEXT PRIMARY KEY,
    "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "AiSettings" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL UNIQUE REFERENCES "Company"("id") ON DELETE CASCADE,
    "chatModel" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "topK" INTEGER NOT NULL DEFAULT 5,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "systemPrompt" TEXT NOT NULL
);

CREATE TABLE "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "event" "AuditEvent" NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER TABLE "Company" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "UserDepartment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentDepartment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AiSettings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;
