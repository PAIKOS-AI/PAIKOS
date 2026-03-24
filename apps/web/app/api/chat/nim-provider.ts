import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const nim = createOpenAICompatible({
  name: "nim",
  apiKey: process.env.NVIDIA_NIM_API_KEY!,
  baseURL: process.env.NVIDIA_NIM_BASE_URL!,
  headers: {
    Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
  },
});
