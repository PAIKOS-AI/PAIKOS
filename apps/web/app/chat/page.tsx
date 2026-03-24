"use client"

import { useCallback, useEffect, useState, memo, Fragment } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@paikos/ui/components/button"
import { cn } from "@paikos/ui/lib/utils"
import {
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  RefreshCcwIcon,
  SparklesIcon,
} from "lucide-react"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
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
} from "@/components/ai-elements/model-selector"
import {
  PromptInput,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"

type UIModel = {
  chef: string
  chefSlug: string
  id: string
  name: string
  providers: string[]
}

interface ModelItemProps {
  model: UIModel
  selectedModel: string
  onSelect: (id: string) => void
}

const starterPrompts = [
  "Map the ingestion flow across this repo",
  "Explain how the graph and memory layers work together",
  "Summarize the API surface and main routes",
  "Suggest a cleanup plan for the current architecture",
]

const ModelItem = memo(({ model, selectedModel, onSelect }: ModelItemProps) => {
  const handleSelect = useCallback(
    () => onSelect(model.id),
    [onSelect, model.id]
  )

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
  )
})

ModelItem.displayName = "ModelItem"

const ChatPage = () => {
  const [input, setInput] = useState("")
  const [open, setOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState("")
  const [availableModels, setAvailableModels] = useState<UIModel[]>([])
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const { messages, sendMessage, status, regenerate, stop } = useChat()

  useEffect(() => {
    let active = true

    const loadModels = async () => {
      try {
        const response = await fetch("/api/models", { cache: "no-store" })

        if (!response.ok) return

        const data = (await response.json()) as { models?: UIModel[] }

        if (active && data.models?.length) {
          const nextModels = data.models
          setAvailableModels(nextModels)
          setSelectedModel((current) =>
            current && nextModels.some((m) => m.id === current)
              ? current
              : (nextModels[0]?.id ?? "")
          )
        }
      } catch {
        // Keep the selector empty when the catalog request fails.
      }
    }

    loadModels()

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const text = message.text.trim()
      if (!text) return
      sendMessage(
        { text },
        selectedModel ? { body: { model: selectedModel } } : undefined
      )
      setInput("")
    },
    [selectedModel, sendMessage]
  )

  const handleModelSelect = useCallback((id: string) => {
    setSelectedModel(id)
    setOpen(false)
  }, [])

  const handleStarterPrompt = useCallback((prompt: string) => {
    setInput(prompt)
  }, [])

  const handleCopy = useCallback(async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      window.setTimeout(() => {
        setCopiedMessageId((current) =>
          current === messageId ? null : current
        )
      }, 1600)
    } catch {
      // Ignore clipboard failures.
    }
  }, [])

  const selectedModelData = availableModels.find(
    (model) => model.id === selectedModel
  )
  const chefs = [...new Set(availableModels.map((model) => model.chef))]

  const isStreaming = status === "submitted" || status === "streaming"
  const promptStatus =
    status === "submitted" || status === "streaming" || status === "error"
      ? status
      : "ready"

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      {/* ── Header ── */}
      <header className="flex h-11 flex-none items-center justify-between border-b px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[13px] font-semibold tracking-tight">
            PAIKOS
          </span>
          <span className="text-border">·</span>
          <span className="text-[12px] text-muted-foreground">Action Demo</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Live status dot */}
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "block size-[7px] rounded-full transition-colors",
                isStreaming
                  ? "animate-pulse bg-amber-400"
                  : status === "error"
                    ? "bg-destructive"
                    : "bg-emerald-500"
              )}
            />
            <span className="hidden text-[11px] text-muted-foreground tabular-nums sm:block">
              {isStreaming
                ? status === "submitted"
                  ? "Sending…"
                  : "Streaming…"
                : status === "error"
                  ? "Error"
                  : `${messages.length} msg`}
            </span>
          </div>

          {/* Model selector */}
          <ModelSelector onOpenChange={setOpen} open={open}>
            <ModelSelectorTrigger asChild>
              <Button
                className="h-7 gap-1.5 rounded-full px-3 text-[12px] font-medium"
                size="sm"
                variant="outline"
              >
                {selectedModelData ? (
                  <>
                    <ModelSelectorLogo provider={selectedModelData.chefSlug} />
                    <ModelSelectorName className="max-w-[14rem]">
                      {selectedModelData.name}
                    </ModelSelectorName>
                  </>
                ) : (
                  <ModelSelectorName className="max-w-[14rem]">
                    {availableModels.length > 0 ? "Select model" : "No models"}
                  </ModelSelectorName>
                )}
              </Button>
            </ModelSelectorTrigger>

            <ModelSelectorContent>
              <ModelSelectorInput placeholder="Search models…" />
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
        </div>
      </header>

      {/* ── Body: scrollable messages + pinned composer ── */}
      <div className="flex min-h-0 flex-1 flex-col">
        <Conversation className="border-0 bg-transparent">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState className="min-h-[55vh] flex-col items-center justify-center gap-8 px-4 text-center sm:px-6">
                <div className="space-y-2">
                  <p className="text-base font-medium">How can I help?</p>
                  <p className="text-sm text-muted-foreground">
                    Ask about the architecture, retrieval flow, or anything in
                    the workspace.
                  </p>
                </div>

                <div className="grid w-full max-w-md grid-cols-2 gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      className="group flex cursor-pointer items-start gap-2 rounded-xl border bg-background px-3 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted hover:text-foreground"
                      key={prompt}
                      onClick={() => handleStarterPrompt(prompt)}
                      type="button"
                    >
                      <SparklesIcon className="mt-0.5 size-3.5 flex-none opacity-50 group-hover:opacity-100" />
                      <span className="leading-snug">{prompt}</span>
                    </button>
                  ))}
                </div>
              </ConversationEmptyState>
            ) : (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8 sm:px-6">
                {messages.map((message, messageIndex) => {
                  const lastTextPartIndex = message.parts.reduce(
                    (lastIndex, part, partIndex) =>
                      part.type === "text" ? partIndex : lastIndex,
                    -1
                  )

                  return (
                    <Fragment key={message.id}>
                      {message.parts.map((part, partIndex) => {
                        if (part.type !== "text") return null

                        const actionId = `${message.id}-${partIndex}`
                        const isLatestAssistantText =
                          message.role === "assistant" &&
                          messageIndex === messages.length - 1 &&
                          partIndex === lastTextPartIndex

                        return (
                          <Fragment key={actionId}>
                            <Message from={message.role}>
                              <MessageContent
                                className={cn(
                                  "group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-sm group-[.is-user]:border group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-2.5 group-[.is-user]:text-foreground",
                                  "group-[.is-assistant]:bg-transparent group-[.is-assistant]:p-0 group-[.is-assistant]:text-foreground"
                                )}
                              >
                                <MessageResponse>{part.text}</MessageResponse>
                              </MessageContent>
                            </Message>

                            {isLatestAssistantText && (
                              <MessageActions className="sm:pl-0.5">
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
                                  onClick={() =>
                                    handleCopy(actionId, part.text)
                                  }
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
                        )
                      })}
                    </Fragment>
                  )
                })}
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton className="bottom-4" />
        </Conversation>

        {/* ── Composer ── always pinned at bottom */}
        <div className="flex-none px-4 pt-2 pb-4 sm:px-6 sm:pb-5">
          <div className="mx-auto w-full max-w-4xl space-y-2">
            <PromptInput
              className="rounded-2xl border bg-background shadow-sm"
              onSubmit={handleSubmit}
            >
              <PromptInputTextarea
                className="px-4 pt-3 text-sm"
                onChange={(event) => setInput(event.currentTarget.value)}
                placeholder="Ask about the architecture, retrieval flow, or anything else…"
                value={input}
              />

              <PromptInputFooter className="items-center justify-end p-2">
                <span className="mr-auto hidden text-[11px] text-muted-foreground sm:block">
                  Shift+Enter for new line
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
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPage
