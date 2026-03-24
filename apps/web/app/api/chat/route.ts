import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { nim } from "./nim-provider";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: nim("meta/llama-3.1-70b-instruct"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
