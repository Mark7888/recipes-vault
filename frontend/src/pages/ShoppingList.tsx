import {
  Box, Button, Flex, Heading, HStack, Input, Text, VStack, Badge, Spinner,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ShoppingListItem, ShoppingHistoryEntry } from '../types';
import {
  useShoppingList,
  useShoppingHistory,
  useAddShoppingItem,
  useUpdateShoppingItem,
  useDeleteShoppingItem,
  useSetItemsBought,
  useClearShoppingList,
  useReaddHistory,
  useDeleteHistory,
} from '../hooks/useShoppingList';
import { addAmounts } from '../utils/amounts';
import { formatDate } from '../utils/date';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Checkbox } from '../components/ui/Checkbox';
import { CartIcon, CloseIcon, EditIcon, UndoIcon } from '../components/ui/icons';

const MANUAL_LABEL = 'Manual';

/**
 * Where a line came from. `recipeId` nulls out when the recipe is deleted while
 * the title snapshot stays, so a source can be nameable but not linkable.
 */
interface ItemSource {
  key: string;
  title: string;
  recipeId: string | null;
}

function sourceOf(item: { recipeId: string | null; recipeTitle: string | null }): ItemSource {
  const title = item.recipeTitle ?? MANUAL_LABEL;
  return { key: item.recipeId ?? title, title, recipeId: item.recipeId };
}

function isManualSource(source: ItemSource) {
  return !source.recipeId && source.title === MANUAL_LABEL;
}

interface MergedLine {
  key: string;
  name: string;
  unit: string;
  amount: string;
  items: ShoppingListItem[];
  sources: ItemSource[];
}

function mergeItems(items: ShoppingListItem[]): MergedLine[] {
  const lines = new Map<string, MergedLine>();
  for (const item of items) {
    const key = `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
    const line = lines.get(key);
    const source = sourceOf(item);
    if (line) {
      line.amount = addAmounts(line.amount, item.amount);
      line.items.push(item);
      if (!line.sources.some(s => s.key === source.key)) line.sources.push(source);
    } else {
      lines.set(key, { key, name: item.name, unit: item.unit, amount: item.amount, items: [item], sources: [source] });
    }
  }
  return [...lines.values()];
}

function itemLabel(name: string, amount: string, unit: string) {
  return [amount, unit, name].filter(Boolean).join(' ');
}

/**
 * Recipe titles are arbitrarily long and a Badge never wraps, so on a phone an
 * untruncated one pushes the row past the viewport and the whole page starts
 * scrolling sideways. Cap the width and ellipsise; the full title stays
 * available as a tooltip. When the source recipe still exists the badge is a
 * link to it.
 */
function SourceBadge({ source }: { source: ItemSource }) {
  const badgeProps = {
    colorPalette: isManualSource(source) ? 'gray' : 'green',
    fontSize: '10px',
    title: source.title,
    minW: 0,
    maxW: { base: '110px', sm: '220px' },
    overflow: 'hidden',
  };
  const label = <Box as="span" truncate>{source.title}</Box>;

  if (!source.recipeId) return <Badge {...badgeProps}>{label}</Badge>;

  return (
    <Badge {...badgeProps} asChild _hover={{ textDecoration: 'underline' }}>
      <Link to={`/recipes/${source.recipeId}`}>{label}</Link>
    </Badge>
  );
}

/** Heading of a "By recipe" group; links to the recipe when it still exists. */
function GroupHeading({ source }: { source: ItemSource }) {
  const color = isManualSource(source) ? 'fg.muted' : 'green.fg';

  if (!source.recipeId) {
    return <Heading size="sm" mb={2} wordBreak="break-word" color={color}>{source.title}</Heading>;
  }

  return (
    <Heading
      asChild
      size="sm"
      mb={2}
      display="inline-block"
      wordBreak="break-word"
      color={color}
      _hover={{ textDecoration: 'underline' }}
    >
      <Link to={`/recipes/${source.recipeId}`}>{source.title}</Link>
    </Heading>
  );
}

function ItemEditor({ item, onDone }: { item: ShoppingListItem; onDone: () => void }) {
  const updateItem = useUpdateShoppingItem();
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount);
  const [unit, setUnit] = useState(item.unit);

  const save = async () => {
    if (!name.trim()) return;
    await updateItem.mutateAsync({ id: item.id, data: { name: name.trim(), amount: amount.trim(), unit: unit.trim() } });
    onDone();
  };

  return (
    <HStack gap={2} flex={1} minW={0} flexWrap="wrap">
      <Input size="sm" w="70px" flexShrink={0} placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Input size="sm" w="70px" flexShrink={0} placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
      <Input size="sm" flex={1} minW="120px" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Button size="xs" colorPalette="green" loading={updateItem.isPending} onClick={save}>Save</Button>
      <Button size="xs" variant="ghost" onClick={onDone}>Cancel</Button>
    </HStack>
  );
}

function TodoRow({
  item, selected, onToggleSelect, showSource,
}: {
  item: ShoppingListItem;
  selected: boolean;
  onToggleSelect: () => void;
  showSource: boolean;
}) {
  const deleteItem = useDeleteShoppingItem();
  const [editing, setEditing] = useState(false);

  return (
    <HStack w="full" minW={0} gap={3} py={1}>
      <Checkbox checked={selected} onToggle={onToggleSelect} />
      {editing ? (
        <ItemEditor item={item} onDone={() => setEditing(false)} />
      ) : (
        <>
          <Flex flex={1} minW={0} align="center" gap={2} flexWrap="wrap">
            <Text minW={0} wordBreak="break-word">{itemLabel(item.name, item.amount, item.unit)}</Text>
            {showSource && <SourceBadge source={sourceOf(item)} />}
          </Flex>
          <Button size="xs" variant="ghost" flexShrink={0} onClick={() => setEditing(true)}><EditIcon size={14} /></Button>
          <Button
            size="xs"
            variant="ghost"
            colorPalette="red"
            flexShrink={0}
            loading={deleteItem.isPending}
            onClick={() => deleteItem.mutate(item.id)}
          >
            <CloseIcon size={14} />
          </Button>
        </>
      )}
    </HStack>
  );
}

function MergedRow({
  line, selectedIds, onToggleSelect,
}: {
  line: MergedLine;
  selectedIds: Set<string>;
  onToggleSelect: (ids: string[]) => void;
}) {
  const deleteItem = useDeleteShoppingItem();
  const [editing, setEditing] = useState(false);
  const ids = line.items.map(i => i.id);
  const selected = ids.every(id => selectedIds.has(id));
  const single = line.items.length === 1;

  return (
    <HStack w="full" minW={0} gap={3} py={1}>
      <Checkbox checked={selected} onToggle={() => onToggleSelect(ids)} />
      {editing && single ? (
        <ItemEditor item={line.items[0]} onDone={() => setEditing(false)} />
      ) : (
        <>
          <Flex flex={1} minW={0} align="center" gap={2} flexWrap="wrap">
            <Text minW={0} wordBreak="break-word">{itemLabel(line.name, line.amount, line.unit)}</Text>
            {line.sources.map((s) => (
              <SourceBadge key={s.key} source={s} />
            ))}
          </Flex>
          {single && <Button size="xs" variant="ghost" flexShrink={0} onClick={() => setEditing(true)}><EditIcon size={14} /></Button>}
          <Button
            size="xs"
            variant="ghost"
            colorPalette="red"
            flexShrink={0}
            loading={deleteItem.isPending}
            onClick={() => ids.forEach(id => deleteItem.mutate(id))}
          >
            <CloseIcon size={14} />
          </Button>
        </>
      )}
    </HStack>
  );
}

function AddItemForm() {
  const addItem = useAddShoppingItem();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    await addItem.mutateAsync({ name: name.trim(), amount: amount.trim(), unit: unit.trim() });
    setName('');
    setAmount('');
    setUnit('');
  };

  const submitOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') void submit(); };

  return (
    <HStack w="full" gap={2} flexWrap="wrap">
      <Input size="sm" w="80px" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={submitOnEnter} />
      <Input size="sm" w="80px" placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} onKeyDown={submitOnEnter} />
      <Input
        size="sm"
        flex={1}
        minW="140px"
        placeholder="Item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={submitOnEnter}
      />
      <Button size="sm" colorPalette="green" loading={addItem.isPending} onClick={submit}>
        + Add
      </Button>
    </HStack>
  );
}

function ListTab() {
  const { data: items, isLoading } = useShoppingList();
  const setBought = useSetItemsBought();
  const clearList = useClearShoppingList();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [grouped, setGrouped] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const todo = useMemo(() => (items ?? []).filter(i => !i.bought), [items]);
  const done = useMemo(() => (items ?? []).filter(i => i.bought), [items]);
  const mergedTodo = useMemo(() => mergeItems(todo), [todo]);
  const mergedDone = useMemo(() => mergeItems(done), [done]);

  const groupedTodo = useMemo(() => {
    const groups = new Map<string, { source: ItemSource; items: ShoppingListItem[] }>();
    for (const item of todo) {
      const source = sourceOf(item);
      const group = groups.get(source.key);
      if (group) group.items.push(item);
      else groups.set(source.key, { source, items: [item] });
    }
    return [...groups.values()];
  }, [todo]);

  const toggleIds = (ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = ids.every(id => next.has(id));
      for (const id of ids) {
        if (allIn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  // Only count selected ids that still exist as unbought items
  const selectedCount = todo.filter(i => selected.has(i.id)).length;
  const allSelected = todo.length > 0 && selectedCount === todo.length;
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(todo.map(i => i.id)));

  const handleBought = async () => {
    const ids = todo.filter(i => selected.has(i.id)).map(i => i.id);
    if (ids.length === 0) return;
    await setBought.mutateAsync({ ids, bought: true });
    setSelected(new Set());
  };

  const handleClear = async () => {
    await clearList.mutateAsync();
    setSelected(new Set());
    setConfirmClear(false);
  };

  if (isLoading) return <Box p={8} textAlign="center"><Spinner size="lg" /></Box>;

  return (
    <VStack align="start" gap={5} w="full">
      <AddItemForm />

      <Flex w="full" justify="space-between" align="center" flexWrap="wrap" gap={2}>
        <HStack gap={4}>
          {todo.length > 0 && (
            <HStack gap={2}>
              <Checkbox checked={allSelected} onToggle={toggleSelectAll} size={16} />
              <Text fontSize="sm" color="fg.muted">Select all</Text>
            </HStack>
          )}
          <HStack gap={1}>
            <Button size="xs" variant={grouped ? 'ghost' : 'solid'} colorPalette="green" onClick={() => setGrouped(false)}>
              All
            </Button>
            <Button size="xs" variant={grouped ? 'solid' : 'ghost'} colorPalette="green" onClick={() => setGrouped(true)}>
              By recipe
            </Button>
          </HStack>
        </HStack>
        <HStack gap={2}>
          <Button
            size="sm"
            colorPalette="green"
            disabled={selectedCount === 0}
            loading={setBought.isPending}
            onClick={handleBought}
          >
            <CartIcon size={14} /> Bought{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
          <Button
            size="sm"
            colorPalette="red"
            variant="outline"
            disabled={todo.length === 0 && done.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            Clear
          </Button>
        </HStack>
      </Flex>

      <ConfirmDialog
        open={confirmClear}
        title="Finish shopping?"
        message={done.length > 0
          ? 'The bought items will be saved to History and the whole list will be cleared.'
          : 'Nothing is marked as bought — the list will just be cleared without a history entry.'}
        loading={clearList.isPending}
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />

      {todo.length === 0 ? (
        <Text color="fg.muted">Nothing to buy. Add items above or from a recipe page.</Text>
      ) : grouped ? (
        <VStack align="start" gap={4} w="full">
          {groupedTodo.map(({ source, items: groupItems }) => (
            <Box key={source.key} w="full" minW={0}>
              <GroupHeading source={source} />
              <VStack align="start" gap={0} w="full">
                {groupItems.map((item) => (
                  <TodoRow
                    key={item.id}
                    item={item}
                    selected={selected.has(item.id)}
                    onToggleSelect={() => toggleIds([item.id])}
                    showSource={false}
                  />
                ))}
              </VStack>
            </Box>
          ))}
        </VStack>
      ) : (
        <VStack align="start" gap={0} w="full">
          {mergedTodo.map((line) => (
            <MergedRow key={line.key} line={line} selectedIds={selected} onToggleSelect={toggleIds} />
          ))}
        </VStack>
      )}

      {done.length > 0 && (
        <Box w="full" borderTopWidth="1px" pt={4}>
          <Heading size="sm" mb={2} color="fg.muted">Done</Heading>
          <VStack align="start" gap={1} w="full">
            {mergedDone.map((line) => (
              <HStack key={line.key} w="full" minW={0} gap={3}>
                <Text flex={1} minW={0} wordBreak="break-word" textDecoration="line-through" color="fg.subtle">
                  {itemLabel(line.name, line.amount, line.unit)}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  flexShrink={0}
                  loading={setBought.isPending}
                  onClick={() => setBought.mutate({ ids: line.items.map(i => i.id), bought: false })}
                >
                  <UndoIcon size={14} /> Not bought
                </Button>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
}

function HistoryCard({ entry, onReadded }: { entry: ShoppingHistoryEntry; onReadded: () => void }) {
  const readd = useReaddHistory();
  const deleteHistory = useDeleteHistory();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, ShoppingHistoryEntry['items']>();
    for (const item of entry.items) {
      const key = item.recipeTitle ?? MANUAL_LABEL;
      const group = map.get(key);
      if (group) group.push(item);
      else map.set(key, [item]);
    }
    return [...map.entries()];
  }, [entry.items]);

  const handleReadd = async () => {
    await readd.mutateAsync(entry.id);
    onReadded();
  };

  return (
    <Box w="full" p={4} borderWidth="1px" borderRadius="md" bg="bg.panel" shadow="sm">
      <Flex justify="space-between" align="center" mb={3} gap={2} flexWrap="wrap">
        <Text fontWeight="semibold">
          {formatDate(entry.createdAt)}
        </Text>
        <HStack gap={2}>
          <Button size="xs" colorPalette="green" variant="outline" loading={readd.isPending} onClick={handleReadd}>
            + Add to shopping list
          </Button>
          <Button size="xs" colorPalette="red" variant="ghost" onClick={() => setConfirmDelete(true)}>
            <CloseIcon size={14} />
          </Button>
        </HStack>
      </Flex>
      <VStack align="start" gap={2} w="full">
        {groups.map(([title, groupItems]) => (
          <Box key={title} w="full" minW={0}>
            <Text fontSize="xs" fontWeight="semibold" wordBreak="break-word" color={title === MANUAL_LABEL ? 'fg.muted' : 'green.fg'}>
              {title}
            </Text>
            {groupItems.map((item, i) => (
              <Text key={i} fontSize="sm" color="fg.muted" wordBreak="break-word">
                {itemLabel(item.name, item.amount, item.unit)}
              </Text>
            ))}
          </Box>
        ))}
      </VStack>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete history entry?"
        message="This shopping history entry will be permanently deleted."
        loading={deleteHistory.isPending}
        onConfirm={async () => { await deleteHistory.mutateAsync(entry.id); setConfirmDelete(false); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Box>
  );
}

function HistoryTab({ onReadded }: { onReadded: () => void }) {
  const { data: entries, isLoading } = useShoppingHistory();

  if (isLoading) return <Box p={8} textAlign="center"><Spinner size="lg" /></Box>;
  if (!entries || entries.length === 0) {
    return <Text color="fg.muted">No past shoppings yet. Finish a shopping with the Clear button to create one.</Text>;
  }

  return (
    <VStack align="start" gap={3} w="full">
      {entries.map((entry) => (
        <HistoryCard key={entry.id} entry={entry} onReadded={onReadded} />
      ))}
    </VStack>
  );
}

export default function ShoppingList() {
  const [tab, setTab] = useState<'list' | 'history'>('list');

  return (
    <Box maxW="800px" mx="auto" py={6}>
      <VStack align="start" gap={5}>
        <Heading size="xl">Shopping List</Heading>
        <HStack gap={1}>
          <Button size="sm" variant={tab === 'list' ? 'solid' : 'ghost'} colorPalette="green" onClick={() => setTab('list')}>
            List
          </Button>
          <Button size="sm" variant={tab === 'history' ? 'solid' : 'ghost'} colorPalette="green" onClick={() => setTab('history')}>
            History
          </Button>
        </HStack>
        <Box w="full">
          {tab === 'list' ? <ListTab /> : <HistoryTab onReadded={() => setTab('list')} />}
        </Box>
      </VStack>
    </Box>
  );
}
