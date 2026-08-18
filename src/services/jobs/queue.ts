type JobName = "ingest-document";

type Handler = (payload: { documentId: string }) => Promise<void>;

export class InProcessJobQueue {
  private handlers = new Map<JobName, Handler>();
  private tail = Promise.resolve();

  register(name: JobName, handler: Handler) {
    this.handlers.set(name, handler);
  }

  enqueue(name: JobName, payload: { documentId: string }) {
    this.tail = this.tail
      .then(async () => {
        const handler = this.handlers.get(name);
        if (!handler) throw new Error(`No handler registered for ${name}`);
        await handler(payload);
      })
      .catch((error) => {
        console.error("Job failed", error);
      });
  }

  waitForIdle() {
    return this.tail;
  }
}

const globalForJobs = globalThis as unknown as {
  jobQueue?: InProcessJobQueue;
};

export function getJobQueue() {
  if (!globalForJobs.jobQueue) {
    globalForJobs.jobQueue = new InProcessJobQueue();
  }
  return globalForJobs.jobQueue;
}
