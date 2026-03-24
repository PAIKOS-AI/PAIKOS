"use client";

import { useCallback, useEffect, useState, memo, Fragment } from "react";
import { useChat } from "@ai-sdk/react";
import { Badge } from "@paikos/ui/components/badge";
import { Button } from "@paikos/ui/components/button";
import { cn } from "@paikos/ui/lib/utils";
import {
  ArrowUpIcon,
  BotIcon,
  CheckIcon,
  CopyIcon,
  RefreshCcwIcon,
  SparklesIcon,
} from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

type UIModel = {
  chef: string;
  chefSlug: string;
  id: string;
  name: string;
  providers: string[];
};

interface ModelItemProps {
  model: UIModel;
  selectedModel: string;
  onSelect: (id: string) => void;
}

const starterPrompts = [
  "Map the ingestion flow across this repo",
  "Explain how the graph and memory layers work together",
  "Summarize the API surface and main routes",
  "Suggest a cleanup plan for the current architecture",
];

const ModelItem = memo(
  ({ model, selectedModel, onSelect }: ModelItemProps) => {
    const handleSelect = useCallback(
      () => onSelect(model.id),
      [onSelect, model.id]
    );

    return (
      <ModelSelectorItem onSelect={handleSelect} value={model.id}>
        <ModelSelectorLogo provider={model.chefSlug} />
        <ModelSelectorName>{model.name}</ModelSelectorName>
        <ModelSelectorLogoGroup>
          {model.providers.map((provider) => (
            <ModelSelectorLogo key={provider} provider={provider} />
          ))}
        </ModelSelectorLogoGroup>
        {selectedModel === model.id ? (
          <CheckIcon className="ml-auto size-4" />
        ) : (
          <div className="ml-auto size-4" />
        )}
      </ModelSelectorItem>
    );
  }
);

ModelItem.displayName = "ModelItem";

const ChatPage = () => {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [availableModels, setAvailableModels] = useState<UIModel[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const { messages, sendMessage, status, regenerate, stop } = useChat();

  useEffect(() => {
    let active = true;

    const loadModels = async () => {
      try {
        const response = await fetch("/api/models", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          models?: UIModel[];
        };

        if (active && data.models?.length) {
          const nextModels = data.models;

          setAvailableModels(nextModels);
          setSelectedModel((current) =>
            current && nextModels.some((model) => model.id === current)
              ? current
              : nextModels[0]?.id ?? ""
          );
        }
      } catch {
        // Keep the selector empty when the catalog request fails.
      }
    };

    loadModels();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const text = message.text.trim();

      if (!text) {
        return;
      }

      sendMessage(
        { text },
        selectedModel ? { body: { model: selectedModel } } : undefined
      );
      setInput("");
    },
    [selectedModel, sendMessage]
  );

  const handleModelSelect = useCallback((id: string) => {
    setSelectedModel(id);
    setOpen(false);
  }, []);

  const handleStarterPrompt = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  const handleCopy = useCallback(async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);

      window.setTimeout(() => {
        setCopiedMessageId((current) =>
          current === messageId ? null : current
        );
      }, 1600);
    } catch {
      // Ignore clipboard failures and keep the UI stable.
    }
  }, []);

  const selectedModelData = availableModels.find(
    (model) => model.id === selectedModel
  );
  const chefs = [...new Set(availableModels.map((model) => model.chef))];
  const promptStatus =
    status === "submitted" || status === "streaming" || status === "error"
      ? status
      : "ready";
  const sessionStateLabel =
    status === "submitted"
      ? "Sending"
      : status === "streaming"
        ? "Streaming"
        : status === "error"
          ? "Error"
          : "Ready";

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <main className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-6xl flex-col overflow-hidden rounded-[32px] border bg-background shadow-sm sm:min-h-[calc(100svh-3rem)]">
        <header className="border-b bg-muted/40 px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full px-3" variant="outline">
                  AI Elements
                </Badge>
                <Badge className="rounded-full px-3" variant="secondary">
                  Action Demo
                </Badge>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Chat UI aligned with the repo&apos;s design system
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                  The same AI-elements primitives are still driving the
                  interaction, but the surface now matches the rest of the repo:
                  softer shells, structured hierarchy, and a proper composed
                  input bar.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-background px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Current model
                </p>
                <p className="mt-2 text-sm font-medium">
                  {selectedModelData?.name ?? "Waiting for catalog"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedModelData
                    ? `${selectedModelData.chef} via the configured model catalog`
                    : availableModels.length > 0
                      ? `${availableModels.length} models available`
                      : "No models returned from /api/models"}
                </p>
              </div>

              <div className="rounded-2xl border bg-background px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Session state
                </p>
                <p className="mt-2 text-sm font-medium">{sessionStateLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {messages.length === 0
                    ? "Start with one of the prompts below or write your own."
                    : `${messages.length} message${messages.length === 1 ? "" : "s"} in this conversation.`}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <Conversation className="border-0 bg-transparent">
            <ConversationContent className="mx-auto flex w-full max-w-3xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
              {messages.length === 0 ? (
                <ConversationEmptyState className="min-h-[42vh] items-start justify-center gap-6 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-foreground">
                      <BotIcon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-lg font-medium">
                        Start a better-looking conversation
                      </h2>
                      <p className="max-w-xl text-sm text-muted-foreground">
                        The functionality is the same, but this surface now
                        behaves like a polished product page instead of a raw
                        demo frame.
                      </p>
                    </div>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-2">
                    {starterPrompts.map((prompt) => (
                      <Button
                        className="h-auto justify-start rounded-2xl px-4 py-4 text-left whitespace-normal"
                        key={prompt}
                        onClick={() => handleStarterPrompt(prompt)}
                        variant="outline"
                      >
                        <SparklesIcon className="mt-0.5 size-4 text-muted-foreground" />
                        <span className="max-w-[24ch] leading-5">{prompt}</span>
                      </Button>
                    ))}
                  </div>
                </ConversationEmptyState>
              ) : (
                messages.map((message, messageIndex) => {
                  const lastTextPartIndex = message.parts.reduce(
                    (lastIndex, part, partIndex) =>
                      part.type === "text" ? partIndex : lastIndex,
                    -1
                  );

                  return (
                    <Fragment key={message.id}>
                      {message.parts.map((part, partIndex) => {
                        if (part.type !== "text") {
                          return null;
                        }

                        const actionId = `${message.id}-${partIndex}`;
                        const isLatestAssistantText =
                          message.role === "assistant" &&
                          messageIndex === messages.length - 1 &&
                          partIndex === lastTextPartIndex;

                        return (
                          <Fragment key={actionId}>
                            <Message from={message.role}>
                              <MessageContent
                                className={cn(
                                  "max-w-[min(100%,44rem)]",
                                  "group-[.is-user]:rounded-[24px] group-[.is-user]:rounded-br-md group-[.is-user]:border group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
                                  "group-[.is-assistant]:max-w-none group-[.is-assistant]:bg-transparent group-[.is-assistant]:p-0 group-[.is-assistant]:text-foreground"
                                )}
                              >
                                <MessageResponse>{part.text}</MessageResponse>
                              </MessageContent>
                            </Message>

                            {isLatestAssistantText && (
                              <MessageActions className="sm:pl-1">
                                <MessageAction
                                  label="Retry"
                                  onClick={() =>
                                    regenerate(
                                      selectedModel
                                        ? { body: { model: selectedModel } }
                                        : undefined
                                    )
                                  }
                                >
                                  <RefreshCcwIcon className="size-3.5" />
                                </MessageAction>
                                <MessageAction
                                  label={
                                    copiedMessageId === actionId
                                      ? "Copied"
                                      : "Copy"
                                  }
                                  onClick={() => handleCopy(actionId, part.text)}
                                >
                                  {copiedMessageId === actionId ? (
                                    <CheckIcon className="size-3.5" />
                                  ) : (
                                    <CopyIcon className="size-3.5" />
                                  )}
                                </MessageAction>
                              </MessageActions>
                            )}
                          </Fragment>
                        );
                      })}
                    </Fragment>
                  );
                })
              )}
            </ConversationContent>
            <ConversationScrollButton className="bottom-6" />
          </Conversation>

          <div className="border-t bg-background/95 px-4 py-4 backdrop-blur sm:px-6 sm:py-6">
            <div className="mx-auto w-full max-w-3xl space-y-3">
              <PromptInput
                className="divide-y-0 rounded-[28px] border bg-background shadow-sm"
                onSubmit={handleSubmit}
              >
                <PromptInputTextarea
                  className="px-5 pt-4 md:text-base"
                  onChange={(event) => setInput(event.currentTarget.value)}
                  placeholder="Ask about the architecture, retrieval flow, or anything else in the workspace..."
                  value={input}
                />

                <PromptInputFooter className="items-center p-2.5">
                  <PromptInputTools>
                    <ModelSelector onOpenChange={setOpen} open={open}>
                      <ModelSelectorTrigger asChild>
                        <PromptInputButton
                          className="rounded-full border font-medium"
                          variant="outline"
                        >
                          {selectedModelData ? (
                            <>
                              <ModelSelectorLogo
                                provider={selectedModelData.chefSlug}
                              />
                              <ModelSelectorName className="max-w-[12rem]">
                                {selectedModelData.name}
                              </ModelSelectorName>
                            </>
                          ) : (
                            <ModelSelectorName className="max-w-[12rem]">
                              {availableModels.length > 0
                                ? "Select model"
                                : "No models"}
                            </ModelSelectorName>
                          )}
                        </PromptInputButton>
                      </ModelSelectorTrigger>

                      <ModelSelectorContent>
                        <ModelSelectorInput placeholder="Search models..." />
                        <ModelSelectorList>
                          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                          {chefs.map((chef) => (
                            <ModelSelectorGroup heading={chef} key={chef}>
                              {availableModels
                                .filter((model) => model.chef === chef)
                                .map((model) => (
                                  <ModelItem
                                    key={model.id}
                                    model={model}
                                    onSelect={handleModelSelect}
                                    selectedModel={selectedModel}
                                  />
                                ))}
                            </ModelSelectorGroup>
                          ))}
                        </ModelSelectorList>
                      </ModelSelectorContent>
                    </ModelSelector>
                  </PromptInputTools>

                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      Enter to send
                    </span>
                    <PromptInputSubmit
                      className="rounded-full"
                      disabled={!input.trim() && promptStatus === "ready"}
                      onStop={stop}
                      status={promptStatus}
                    >
                      {promptStatus === "ready" && (
                        <ArrowUpIcon className="size-4" />
                      )}
                    </PromptInputSubmit>
                  </div>
                </PromptInputFooter>
              </PromptInput>

              <p className="text-center text-xs text-muted-foreground">
                Shift+Enter for a new line. Retry and copy actions stay attached
                to the latest assistant response.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatPage;
