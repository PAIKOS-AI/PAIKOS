"use client";

import { useCallback, useEffect, useState, memo, Fragment } from "react";
import {
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { MessageResponse } from "@/components/ai-elements/message";
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
import { Button } from "@paikos/ui/components/button";
import { RefreshCcwIcon, CopyIcon, CheckIcon } from "lucide-react";
import { useChat } from "@ai-sdk/react";

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

const ModelItem = memo(
  ({ model, selectedModel, onSelect }: ModelItemProps) => {
    const handleSelect = useCallback(() => onSelect(model.id), [onSelect, model.id]);

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

const ActionsDemo = () => {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [availableModels, setAvailableModels] = useState<UIModel[]>([]);
  const { messages, sendMessage, status, regenerate } = useChat();

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

  const handleSubmit = useCallback((message: PromptInputMessage) => {
    if (message.text.trim()) {
      sendMessage(
        { text: message.text },
        { body: { model: selectedModel } }
      );
      setInput("");
    }
  }, [selectedModel, sendMessage]);

  const handleModelSelect = useCallback((id: string) => {
    setSelectedModel(id);
    setOpen(false);
  }, []);

  const selectedModelData = availableModels.find(
    (model) => model.id === selectedModel
  );
  const chefs = [...new Set(availableModels.map((model) => model.chef))];

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent>
            {messages.map((message, messageIndex) => (
              <Fragment key={message.id}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text": {
                      const isLastMessage =
                        messageIndex === messages.length - 1;

                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <MessageResponse>{part.text}</MessageResponse>
                            </MessageContent>
                          </Message>
                          {message.role === "assistant" && isLastMessage && (
                            <MessageActions>
                              <MessageAction
                                onClick={() =>
                                  regenerate({ body: { model: selectedModel } })
                                }
                                label="Retry"
                              >
                                <RefreshCcwIcon className="size-3" />
                              </MessageAction>
                              <MessageAction
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                                label="Copy"
                              >
                                <CopyIcon className="size-3" />
                              </MessageAction>
                            </MessageActions>
                          )}
                        </Fragment>
                      );
                    }
                    default:
                      return null;
                  }
                })}
              </Fragment>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput
          onSubmit={handleSubmit}
          className="mt-4 w-full max-w-2xl mx-auto relative"
        >
          <div className="mb-2">
            <ModelSelector onOpenChange={setOpen} open={open}>
              <ModelSelectorTrigger asChild>
                <Button className="w-[220px] justify-between" variant="outline">
                  <div className="flex min-w-0 items-center gap-2">
                    {selectedModelData ? (
                      <>
                        <ModelSelectorLogo provider={selectedModelData.chefSlug} />
                        <ModelSelectorName>{selectedModelData.name}</ModelSelectorName>
                      </>
                    ) : (
                      <ModelSelectorName>Select model</ModelSelectorName>
                    )}
                  </div>
                </Button>
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
          </div>
          <PromptInputTextarea
            value={input}
            placeholder="Say something..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status === "streaming" ? "streaming" : "ready"}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </PromptInput>
      </div>
    </div>
  );
};

export default ActionsDemo;
