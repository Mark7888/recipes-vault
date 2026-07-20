import {
  Box, Button, Flex, Heading, HStack, Input, Text, VStack, Badge, Spinner,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
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

interface MergedLine {
  key: string;
  name: string;
  unit: string;
  amount: string;
  items: ShoppingListItem[];
  sources: string[];
}

function mergeItems(items: ShoppingListItem[]): MergedLine[] {
  const lines = new Map<string, MergedLine>();
  for (const item of items) {
    const key = `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
    const line = lines.get(key);
    const source = item.recipeTitle ?? MANUAL_LABEL;
    if (line) {
      line.amount = addAmounts(line.amount, item.amount);
      line.items.push(item);
      if (!line.sources.includes(source)) line.sources.push(source);
    } else {
      lines.set(key, { key, name: item.name, unit: item.unit, amount: item.amount, items: [item], sources: [source] });
    }
  }
  return [...lines.values()];
}

function itemLabel(name: string, amount: string, unit: string) {
  return [amount, unit, name].filter(Boolean).join(' ');
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
    <HStack gap={2} flex={1} flexWrap="wrap">
      <Input size="sm" w="70px" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Input size="sm" w="70px" placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
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
    <HStack w="full" gap={3} py={1}>
      <Checkbox checked={selected} onToggle={onToggleSelect} />
      {editing ? (
        <ItemEditor item={item} onDone={() => setEditing(false)} />
      ) : (
        <>
          <Text flex={1}>{itemLabel(item.name, item.amount, item.unit)}</Text>
          {showSource && (
            <Badge colorPalette={item.recipeTitle ? 'green' : 'gray'} fontSize="10px">
              {item.recipeTitle ?? MANUAL_LABEL}
            </Badge>
          )}
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)}><EditIcon size={14} /></Button>
          <Button
            size="xs"
            variant="ghost"
            colorPalette="red"
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
    <HStack w="full" gap={3} py={1}>
      <Checkbox checked={selected} onToggle={() => onToggleSelect(ids)} />
      {editing && single ? (
        <ItemEditor item={line.items[0]} onDone={() => setEditing(false)} />
      ) : (
        <>
          <Text flex={1}>{itemLabel(line.name, line.amount, line.unit)}</Text>
          {line.sources.map((s) => (
            <Badge key={s} colorPalette={s === MANUAL_LABEL ? 'gray' : 'green'} fontSize="10px">{s}</Badge>
          ))}
          {single && <Button size="xs" variant="ghost" onClick={() => setEditing(true)}><EditIcon size={14} /></Button>}
          <Button
            size="xs"
            variant="ghost"
            colorPalette="red"
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
    const groups = new Map<string, ShoppingListItem[]>();
    for (const item of todo) {
      const key = item.recipeTitle ?? MANUAL_LABEL;
      const group = groups.get(key);
      if (group) group.push(item);
      else groups.set(key, [item]);
    }
    return [...groups.entries()];
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
              <Text fontSize="sm" color="gray.500">Select all</Text>
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
        <Text color="gray.500">Nothing to buy. Add items above or from a recipe page.</Text>
      ) : grouped ? (
        <VStack align="start" gap={4} w="full">
          {groupedTodo.map(([title, groupItems]) => (
            <Box key={title} w="full">
              <Heading size="sm" mb={2} color={title === MANUAL_LABEL ? 'gray.600' : 'green.700'}>
                {title}
              </Heading>
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
          <Heading size="sm" mb={2} color="gray.600">Done</Heading>
          <VStack align="start" gap={1} w="full">
            {mergedDone.map((line) => (
              <HStack key={line.key} w="full" gap={3}>
                <Text flex={1} textDecoration="line-through" color="gray.400">
                  {itemLabel(line.name, line.amount, line.unit)}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
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
    <Box w="full" p={4} borderWidth="1px" borderRadius="md" bg="white" shadow="sm">
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
      <VStack align="start" gap={2}>
        {groups.map(([title, groupItems]) => (
          <Box key={title}>
            <Text fontSize="xs" fontWeight="semibold" color={title === MANUAL_LABEL ? 'gray.500' : 'green.700'}>
              {title}
            </Text>
            {groupItems.map((item, i) => (
              <Text key={i} fontSize="sm" color="gray.700">
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
    return <Text color="gray.500">No past shoppings yet. Finish a shopping with the Clear button to create one.</Text>;
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
