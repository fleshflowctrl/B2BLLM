export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface LLMProvider {
  generate(params: {
    messages: LLMMessage[];
    temperature?: number;
    model?: string;
  }): Promise<string>;
  stream?(params: {
    messages: LLMMessage[];
    temperature?: number;
    model?: string;
  }): AsyncGenerator<string>;
}
