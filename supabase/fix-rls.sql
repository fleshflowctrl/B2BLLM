-- Paste this into Supabase → SQL Editor → Run.
-- Fixes: new row violates row-level security policy for table "Company"

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

DROP POLICY IF EXISTS allow_all ON "Company";
DROP POLICY IF EXISTS allow_all ON "User";
DROP POLICY IF EXISTS allow_all ON "Department";
DROP POLICY IF EXISTS allow_all ON "UserDepartment";
DROP POLICY IF EXISTS allow_all ON "Document";
DROP POLICY IF EXISTS allow_all ON "DocumentDepartment";
DROP POLICY IF EXISTS allow_all ON "Conversation";
DROP POLICY IF EXISTS allow_all ON "Message";
DROP POLICY IF EXISTS allow_all ON "AiSettings";
DROP POLICY IF EXISTS allow_all ON "AuditLog";

CREATE POLICY allow_all ON "Company" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "User" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "Department" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "UserDepartment" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "Document" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "DocumentDepartment" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "Conversation" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "Message" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "AiSettings" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "AuditLog" FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE "Company" TO anon, authenticated;
GRANT ALL ON TABLE "User" TO anon, authenticated;
GRANT ALL ON TABLE "Department" TO anon, authenticated;
GRANT ALL ON TABLE "UserDepartment" TO anon, authenticated;
GRANT ALL ON TABLE "Document" TO anon, authenticated;
GRANT ALL ON TABLE "DocumentDepartment" TO anon, authenticated;
GRANT ALL ON TABLE "Conversation" TO anon, authenticated;
GRANT ALL ON TABLE "Message" TO anon, authenticated;
GRANT ALL ON TABLE "AiSettings" TO anon, authenticated;
GRANT ALL ON TABLE "AuditLog" TO anon, authenticated;
