-- Paste into Supabase → SQL Editor → Run.
-- Fixes: new row violates row-level security policy for table "Company"

ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserDepartment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentDepartment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY allow_all ON "Company" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "User" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "Department" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "UserDepartment" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "Document" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "DocumentDepartment" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "Conversation" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "Message" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "AiSettings" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON "AuditLog" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

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
