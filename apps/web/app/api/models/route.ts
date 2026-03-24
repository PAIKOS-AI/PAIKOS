import { NextResponse } from "next/server";

type NimModel = {
  id: string;
  name?: string;
  owned_by?: string;
};

const formatProviderName = (provider: string) =>
  provider
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export async function GET() {
  try {
    const response = await fetch(`${process.env.NVIDIA_NIM_BASE_URL}/models`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ models: [] }, { status: response.status });
    }

    const data = (await response.json()) as { data?: NimModel[] };

    const models = (data.data ?? [])
      .map((model) => {
        const provider = model.owned_by ?? "nvidia";
        const chefSlug = provider.toLowerCase().replace(/\s+/g, "-");

        return {
          chef: formatProviderName(chefSlug),
          chefSlug,
          id: model.id,
          name: model.name || model.id,
          providers: [chefSlug],
        };
      });

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] }, { status: 500 });
  }
}
