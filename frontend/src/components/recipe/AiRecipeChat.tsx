import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, HStack, IconButton, Image, Spinner, Text, Textarea, VStack, Badge,
  useBreakpointValue,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import type { AiChatMessage } from '../../api/ai.api';
import { useAiChat, useAiCreateRecipe } from '../../hooks/useAi';
import { getAiFailure, type AiFailure } from '../../utils/errors';
import { fileToChatImage } from '../../utils/image';
import {
  SparkleIcon, PaperclipIcon, SendIcon, CloseIcon, RefreshIcon,
} from '../ui/icons';

/** A chat turn plus the bits of UI state that never travel to the server. */
export interface ChatEntry extends AiChatMessage {
  truncated?: boolean;
}

interface Props {
  messages: ChatEntry[];
  onMessagesChange: (messages: ChatEntry[]) => void;
  model?: string | null;
}

const MAX_IMAGES_PER_CHAT = 6;

const SUGGESTIONS = [
  'Suggest a quick weeknight dinner',
  'What can I cook with chickpeas and spinach?',
  'A simple dessert for 6 people',
  'Something warming for a cold evening',
];

const toWire = (entries: ChatEntry[]): AiChatMessage[] =>
  entries.map(({ role, content, images }) => ({ role, content, ...(images?.length ? { images } : {}) }));

const countImages = (entries: ChatEntry[]): number =>
  entries.reduce((sum, entry) => sum + (entry.images?.length ?? 0), 0);

/**
 * Renders assistant replies. The model answers in plain text with the odd
 * `**bold**`, dash bullet or numbered step, so this handles exactly that rather
 * than pulling in a markdown dependency.
 */
function RichText({ text }: { text: string }) {
  const renderInline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4
        ? <Text as="span" key={i} fontWeight="semibold">{part.slice(2, -2)}</Text>
        : <Text as="span" key={i}>{part}</Text>
    );

  return (
    <VStack align="stretch" gap={1}>
      {text.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <Box key={i} h={1} />;

        const bullet = /^[-*•]\s+(.*)$/.exec(trimmed);
        if (bullet) {
          return (
            <HStack key={i} align="start" gap={2} pl={1}>
              <Text color="green.fg" lineHeight="1.6">•</Text>
              <Text lineHeight="1.6">{renderInline(bullet[1])}</Text>
            </HStack>
          );
        }

        const numbered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
        if (numbered) {
          return (
            <HStack key={i} align="start" gap={2} pl={1}>
              <Text color="green.fg" fontWeight="semibold" lineHeight="1.6" minW="5">{numbered[1]}.</Text>
              <Text lineHeight="1.6">{renderInline(numbered[2])}</Text>
            </HStack>
          );
        }

        return <Text key={i} lineHeight="1.6">{renderInline(trimmed)}</Text>;
      })}
    </VStack>
  );
}

function ErrorPanel({ failure, onRetry, retrying }: { failure: AiFailure; onRetry?: () => void; retrying?: boolean }) {
  return (
    <Box w="full" p={3} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
      <VStack align="start" gap={2}>
        <Text color="fg.error" fontSize="sm">{failure.message}</Text>
        {failure.retryable && onRetry && (
          <Button size="xs" variant="outline" colorPalette="red" onClick={onRetry} loading={retrying}>
            <RefreshIcon size={13} /> Try again
          </Button>
        )}
      </VStack>
    </Box>
  );
}

export function AiRecipeChat({ messages, onMessagesChange, model }: Props) {
  const navigate = useNavigate();
  const chat = useAiChat();
  const createRecipe = useAiCreateRecipe();

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachError, setAttachError] = useState('');
  const [chatFailure, setChatFailure] = useState<AiFailure | null>(null);
  const [saveFailure, setSaveFailure] = useState<AiFailure | null>(null);
  const [dragging, setDragging] = useState(false);
  const placeholder = useBreakpointValue({
    base: 'Ask or paste a screenshot…',
    md: 'Ask for a recipe, or paste a screenshot…',
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const busy = chat.isPending || createRecipe.isPending;
  const hasReply = messages.some((m) => m.role === 'assistant');
  // Losing access mid-chat (or the server losing its key) makes every further
  // request pointless, so the composer goes away instead of failing repeatedly.
  const lockedOut = chatFailure?.code === 'AI_FORBIDDEN' || chatFailure?.code === 'AI_NOT_CONFIGURED';
  const canRetry = messages.length > 0 && messages[messages.length - 1].role === 'user';

  useEffect(() => {
    // Only follow the transcript once it exists — the empty state is taller
    // than the panel on phones and would otherwise open scrolled past its intro.
    if (messages.length === 0) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, chat.isPending, chatFailure]);

  async function send(text: string, images: string[]) {
    const trimmed = text.trim();
    if ((!trimmed && images.length === 0) || busy) return;

    const next: ChatEntry[] = [...messages, { role: 'user', content: trimmed, ...(images.length ? { images } : {}) }];
    onMessagesChange(next);
    setInput('');
    setAttachments([]);
    setChatFailure(null);
    setSaveFailure(null);
    await requestReply(next);
  }

  async function requestReply(history: ChatEntry[]) {
    setChatFailure(null);
    try {
      const result = await chat.mutateAsync(toWire(history));
      onMessagesChange([
        ...history,
        { role: 'assistant', content: result.message.content, truncated: result.truncated },
      ]);
    } catch (err) {
      // The user's turn stays in the transcript so "Try again" can resend it.
      setChatFailure(getAiFailure(err));
    }
  }

  async function handleSave() {
    setSaveFailure(null);
    try {
      const { recipeId } = await createRecipe.mutateAsync(toWire(messages));
      navigate(`/recipes/${recipeId}/edit`);
    } catch (err) {
      setSaveFailure(getAiFailure(err));
    }
  }

  async function addFiles(files: File[]) {
    setAttachError('');
    const room = MAX_IMAGES_PER_CHAT - countImages(messages) - attachments.length;
    if (room <= 0) {
      setAttachError(`This chat already has ${MAX_IMAGES_PER_CHAT} images. Start a new chat to attach more.`);
      return;
    }

    const accepted: string[] = [];
    for (const file of files.slice(0, room)) {
      try {
        accepted.push(await fileToChatImage(file));
      } catch (err) {
        setAttachError((err as Error).message);
      }
    }
    if (files.length > room) {
      setAttachError(`Only ${room} more image${room === 1 ? '' : 's'} can be attached to this chat.`);
    }
    if (accepted.length) setAttachments((prev) => [...prev, ...accepted]);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    e.preventDefault();
    void addFiles(files);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) void addFiles(files);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input, attachments);
    }
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function startOver() {
    onMessagesChange([]);
    setInput('');
    setAttachments([]);
    setChatFailure(null);
    setSaveFailure(null);
    setAttachError('');
  }

  return (
    <Box
      borderWidth="1px"
      borderColor={dragging ? 'green.500' : 'border'}
      borderRadius="xl"
      overflow="hidden"
      bg="bg.panel"
      display="flex"
      flexDirection="column"
      h={{ base: 'calc(100dvh - 300px)', md: '620px' }}
      minH="360px"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <HStack px={4} py={3} borderBottomWidth="1px" justify="space-between" bg="bg.subtle" flexShrink={0}>
        <HStack gap={2} minW="0">
          <Box color="green.fg"><SparkleIcon size={18} /></Box>
          <Text fontWeight="semibold">Recipe assistant</Text>
          {model && (
            <Badge size="sm" colorPalette="gray" maxW="200px" truncate hideBelow="sm">{model}</Badge>
          )}
        </HStack>
        {messages.length > 0 && (
          <Button size="xs" variant="ghost" onClick={startOver} disabled={busy}>New chat</Button>
        )}
      </HStack>

      {/* Transcript */}
      <Box ref={scrollRef} flex="1" overflowY="auto" px={4} py={4}>
        {messages.length === 0 ? (
          <VStack gap={5} py={8} px={2} textAlign="center">
            <Box color="green.fg"><SparkleIcon size={34} /></Box>
            <VStack gap={1}>
              <Text fontWeight="semibold">Chat your way to a recipe</Text>
              <Text fontSize="sm" color="fg.muted" maxW="420px">
                Ask for ideas, talk through what you have in the fridge, or attach a screenshot of a
                recipe. When you like what you see, save it straight to your library.
              </Text>
            </VStack>
            <VStack gap={2} w="full" maxW="420px">
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  size="sm"
                  variant="outline"
                  w="full"
                  fontWeight="normal"
                  onClick={() => void send(suggestion, [])}
                  disabled={busy}
                >
                  {suggestion}
                </Button>
              ))}
            </VStack>
          </VStack>
        ) : (
          <VStack align="stretch" gap={4}>
            {messages.map((message, i) => (
              <VStack key={i} align={message.role === 'user' ? 'flex-end' : 'flex-start'} gap={1}>
                <Box
                  maxW={{ base: '92%', md: '80%' }}
                  px={4}
                  py={3}
                  borderRadius="xl"
                  borderTopRightRadius={message.role === 'user' ? 'sm' : 'xl'}
                  borderTopLeftRadius={message.role === 'user' ? 'xl' : 'sm'}
                  bg={message.role === 'user' ? 'green.600' : 'bg.subtle'}
                  color={message.role === 'user' ? 'white' : 'fg'}
                  borderWidth={message.role === 'user' ? 0 : '1px'}
                  fontSize="sm"
                >
                  {message.images && message.images.length > 0 && (
                    <HStack gap={2} mb={message.content ? 2 : 0} flexWrap="wrap">
                      {message.images.map((src, idx) => (
                        <Image
                          key={idx}
                          src={src}
                          alt={`Attachment ${idx + 1}`}
                          maxH="140px"
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="whiteAlpha.500"
                        />
                      ))}
                    </HStack>
                  )}
                  {message.content && (
                    message.role === 'user'
                      ? <Text whiteSpace="pre-wrap">{message.content}</Text>
                      : <RichText text={message.content} />
                  )}
                </Box>
                {message.truncated && (
                  <Text fontSize="xs" color="fg.muted">
                    This reply hit the length limit and may be incomplete.
                  </Text>
                )}
              </VStack>
            ))}

            {chat.isPending && (
              <HStack gap={2} color="fg.muted" px={1}>
                <Spinner size="xs" />
                <Text fontSize="sm">Thinking…</Text>
              </HStack>
            )}

            {chatFailure && (
              <ErrorPanel
                failure={chatFailure}
                retrying={chat.isPending}
                onRetry={canRetry ? () => void requestReply(messages) : undefined}
              />
            )}
          </VStack>
        )}
      </Box>

      {/* Composer */}
      {lockedOut ? (
        <Box px={4} py={4} borderTopWidth="1px" flexShrink={0}>
          <Text fontSize="sm" color="fg.muted">
            The assistant is unavailable for your account right now.
          </Text>
        </Box>
      ) : (
        <Box borderTopWidth="1px" px={3} py={3} flexShrink={0}>
          {attachments.length > 0 && (
            <HStack gap={2} mb={2} flexWrap="wrap">
              {attachments.map((src, i) => (
                <Box key={i} position="relative">
                  <Image src={src} alt={`Attachment ${i + 1}`} h="56px" borderRadius="md" borderWidth="1px" />
                  <IconButton
                    aria-label="Remove attachment"
                    size="2xs"
                    colorPalette="red"
                    position="absolute"
                    top="-6px"
                    right="-6px"
                    borderRadius="full"
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <CloseIcon size={10} />
                  </IconButton>
                </Box>
              ))}
            </HStack>
          )}

          {attachError && (
            <Text fontSize="xs" color="fg.error" mb={2}>{attachError}</Text>
          )}

          <HStack gap={2} align="end">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                void addFiles(Array.from(e.target.files ?? []));
                if (fileRef.current) fileRef.current.value = '';
              }}
            />
            <IconButton
              aria-label="Attach a screenshot"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <PaperclipIcon size={18} />
            </IconButton>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoGrow(e.currentTarget); }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              rows={1}
              resize="none"
              minH="44px"
              maxH="160px"
              disabled={busy}
            />
            <IconButton
              aria-label="Send message"
              colorPalette="green"
              onClick={() => void send(input, attachments)}
              loading={chat.isPending}
              disabled={busy || (!input.trim() && attachments.length === 0)}
            >
              <SendIcon size={18} />
            </IconButton>
          </HStack>

          <VStack align="stretch" gap={2} mt={3}>
            {saveFailure && (
              <ErrorPanel failure={saveFailure} retrying={createRecipe.isPending} onRetry={() => void handleSave()} />
            )}
            <HStack justify="space-between" gap={3} flexWrap="wrap">
              <Text fontSize="xs" color="fg.muted">
                {hasReply
                  ? 'Happy with the recipe? Save it and finish the details in the editor.'
                  : 'Enter sends · Shift+Enter adds a line'}
              </Text>
              <Button
                colorPalette="green"
                size="sm"
                onClick={() => void handleSave()}
                loading={createRecipe.isPending}
                loadingText="Building recipe…"
                disabled={!hasReply || busy}
              >
                <SparkleIcon size={15} /> Save as recipe
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}
    </Box>
  );
}
