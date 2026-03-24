import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { nim } from "./nim-provider"

export const maxDuration = 30

const DEFAULT_MODEL = "meta/llama-3.1-70b-instruct"

const modelMap: Record<string, string> = {
  "llama-3.1-70b": "meta/llama-3.1-70b-instruct",
  "llama-3.1-8b": "meta/llama-3.1-8b-instruct",
  "llama-3.3-70b": "meta/llama-3.3-70b-instruct",
}

export async function POST(req: Request) {
  const { messages, model }: { messages: UIMessage[]; model?: string } =
    await req.json()

  const result = streamText({
    model: nim(model ? (modelMap[model] ?? model) : DEFAULT_MODEL),
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
