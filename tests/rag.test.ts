import { describe, expect, it } from "vitest";
import { UNKNOWN_ANSWER } from "@/lib/constants";
import { unknownAnswer } from "@/services/rag/prompt";
import { retrieveContext, toCitations } from "@/services/rag/retrieve";
import { InMemoryVectorStore } from "@/services/vector/memory";
import type { AccessContext } from "@/types/auth";

const user: AccessContext = {
  id: "eng",
  email: "eng@acme.local",
  name: "Engineer",
  role: "EMPLOYEE",
  status: "ACTIVE",
  companyId: "acme",
  companyName: "Acme",
  departmentIds: ["engineering"],
};

const embedding = [1, 0, 0, 0];

describe("RAG retrieval", () => {
  it("retrieves and cites the matching permitted document", async () => {
    const vector = new InMemoryVectorStore();
    await vector.upsert([
      {
        id: "11111111-1111-4111-8111-111111111111",
        embedding,
        payload: {
          companyId: "acme",
          documentId: "doc-1",
          chunkId: "doc-1:0",
          departmentIds: ["engineering"],
          allEmployees: false,
          filename: "machine-482.txt",
          pageNumber: 1,
          chunkIndex: 0,
          text: "Machine 482 failed because of hydraulic pump overheating.",
        },
      },
    ]);

    const hits = await retrieveContext({
      queryEmbedding: embedding,
      user,
      vector,
      topK: 5,
      minScore: 0.01,
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.payload.filename).toBe("machine-482.txt");
    const citations = toCitations(hits);
    expect(citations[0]?.documentId).toBe("doc-1");
    expect(citations[0]?.excerpt).toContain("hydraulic pump");
  });

  it("returns no hits when nothing relevant exists", async () => {
    const vector = new InMemoryVectorStore();
    const hits = await retrieveContext({
      queryEmbedding: embedding,
      user,
      vector,
      topK: 5,
    });
    expect(hits).toHaveLength(0);
    expect(unknownAnswer()).toBe(UNKNOWN_ANSWER);
  });
});
