"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import LecturerShell from '@/components/lecturer/LecturerShell';
import Card from '@/components/lecturer/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  MessageSquare,
  Settings,
  Maximize2,
  Send,
  Lightbulb,
  Plus,
  ChevronDown,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AIConversation,
  LecturerCourse,
  LearningUnit,
  LearningUnitSummary,
  answerAI,
  createAIConversation,
  deleteAIConversation,
  getCourseLearningUnitSummaries,
  getCourseLearningUnits,
  getMyCourses,
  listAIConversations,
  updateAIConversation,
  updateAIConversationTitle,
} from '@/lib/auth-api';

export default function AiChatbotPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedConversationId = searchParams.get('conversationId');

  type Lens = 'default' | 'academic' | 'feynman' | 'practitioner';
  const LENS_STORAGE_KEY = 'ai-chat-lens:v1';
  const [lens, setLens] = useState<Lens>('default');

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(LENS_STORAGE_KEY);
      if (
        saved === 'default' ||
        saved === 'academic' ||
        saved === 'feynman' ||
        saved === 'practitioner'
      ) {
        setLens(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LENS_STORAGE_KEY, lens);
    } catch {}
  }, [lens]);

  useEffect(() => {
    let mounted = true;
    setLoadingConversations(true);
    setConversationError(null);
    listAIConversations()
      .then((data) => {
        if (!mounted) return;
        setConversations(data);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setConversationError(
          err instanceof Error ? err.message : 'Failed to load conversations',
        );
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingConversations(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((c) => c.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  function truncateWords(value: string, maxWords: number) {
    const clean = value.trim();
    if (!clean) return 'New Conversation';
    const words = clean.split(/\s+/);
    if (words.length <= maxWords) return clean;
    return `${words.slice(0, maxWords).join(' ')}...`;
  }

  function formatConversationDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
    return formatted.replace(/^[A-Za-z]+/, (m) => m.toLowerCase());
  }

  async function handleCreateConversation() {
    setCreateLoading(true);
    setConversationError(null);
    try {
      const created = await createAIConversation(createTitle.trim());
      setConversations((prev) => [created, ...prev]);
      setCreateTitle('');
      setCreateOpen(false);
    } catch (err) {
      setConversationError(
        err instanceof Error ? err.message : 'Failed to create conversation',
      );
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleRenameConversation(conversationId: string) {
    setRenameLoading(true);
    setConversationError(null);
    try {
      const updated = await updateAIConversationTitle(
        conversationId,
        renameTitle.trim(),
      );
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? updated : c)),
      );
      setRenamingId(null);
      setRenameTitle('');
    } catch (err) {
      setConversationError(
        err instanceof Error ? err.message : 'Failed to rename conversation',
      );
    } finally {
      setRenameLoading(false);
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    if (!window.confirm('Delete this conversation?')) return;
    setDeleteLoadingId(conversationId);
    setConversationError(null);
    try {
      await deleteAIConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (selectedConversationId === conversationId) {
        router.push('/ai');
      }
    } catch (err) {
      setConversationError(
        err instanceof Error ? err.message : 'Failed to delete conversation',
      );
    } finally {
      setDeleteLoadingId(null);
    }
  }

  const [kbOpen, setKbOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const [kbApplied, setKbApplied] = useState(false);
  const [kbApplying, setKbApplying] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [kbApplyingTitle, setKbApplyingTitle] = useState('Preparing Knowledge base....');
  const [kbApplyingDescription, setKbApplyingDescription] = useState(
    'Preparing your knowledge base and generating suggestions.',
  );
  const [kbChangeNotice, setKbChangeNotice] = useState<string | null>(null);
  const [kbRecentlyRemovedCourseIds, setKbRecentlyRemovedCourseIds] = useState<string[]>([]);
  const [kbRecentlyRemovedUnitIds, setKbRecentlyRemovedUnitIds] = useState<string[]>([]);
  const [kbRecentlyRemovedAt, setKbRecentlyRemovedAt] = useState<number | null>(null);

  const [kbCourses, setKbCourses] = useState<LecturerCourse[]>([]);
  const [kbCoursesLoading, setKbCoursesLoading] = useState(false);
  const [kbCoursesError, setKbCoursesError] = useState<string | null>(null);

  const [kbSelectedCourseIds, setKbSelectedCourseIds] = useState<string[]>([]);
  const [kbSelectedUnitIds, setKbSelectedUnitIds] = useState<string[]>([]);
  const [kbAppliedCourseIds, setKbAppliedCourseIds] = useState<string[]>([]);
  const [kbAppliedUnitIds, setKbAppliedUnitIds] = useState<string[]>([]);
  const [courseQuery, setCourseQuery] = useState('');
  const [unitQuery, setUnitQuery] = useState('');

  const [kbUnitsByCourse, setKbUnitsByCourse] = useState<Record<string, LearningUnit[]>>({});
  const [kbUnitsLoadingByCourse, setKbUnitsLoadingByCourse] = useState<Record<string, boolean>>({});

  const [messages, setMessages] = useState<
    Array<{ id: string; role: 'assistant' | 'user'; content: string; pending?: boolean }>
  >([]);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; title: string; tag: string }>>([]);
  const [askedSuggestionIds, setAskedSuggestionIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const CACHE_TTL_MS = 2 * 24 * 60 * 60 * 1000;

  function cacheKey(conversationId: string) {
    return `ai-conversation-cache:v1:${conversationId}`;
  }

  function loadConversationCache(conversationId: string): {
    kbCourseIds: string[];
    kbUnitIds: string[];
    messages: Array<{ id: string; role: 'assistant' | 'user'; content: string }>;
    suggestions: Array<{ id: string; title: string; tag: string }>;
    askedSuggestionIds: string[];
  } | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(cacheKey(conversationId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        expiresAt?: number;
        kbCourseIds?: unknown;
        kbUnitIds?: unknown;
        messages?: unknown;
        suggestions?: unknown;
        askedSuggestionIds?: unknown;
      };
      if (!parsed || typeof parsed !== 'object') return null;
      if (typeof parsed.expiresAt === 'number' && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(cacheKey(conversationId));
        return null;
      }

      const kbCourseIds = Array.isArray(parsed.kbCourseIds)
        ? (parsed.kbCourseIds.filter((x) => typeof x === 'string') as string[])
        : [];
      const kbUnitIds = Array.isArray(parsed.kbUnitIds)
        ? (parsed.kbUnitIds.filter((x) => typeof x === 'string') as string[])
        : [];
      const messages = Array.isArray(parsed.messages)
        ? (parsed.messages
            .filter(
              (m) =>
                m &&
                typeof m === 'object' &&
                typeof (m as any).id === 'string' &&
                ((m as any).role === 'assistant' || (m as any).role === 'user') &&
                typeof (m as any).content === 'string',
            )
            .map((m) => ({
              id: (m as any).id as string,
              role: (m as any).role as 'assistant' | 'user',
              content: (m as any).content as string,
            })) as Array<{ id: string; role: 'assistant' | 'user'; content: string }>)
        : [];
      const suggestions = Array.isArray(parsed.suggestions)
        ? (parsed.suggestions
            .filter(
              (s) =>
                s &&
                typeof s === 'object' &&
                typeof (s as any).id === 'string' &&
                typeof (s as any).title === 'string' &&
                typeof (s as any).tag === 'string',
            )
            .map((s) => ({
              id: (s as any).id as string,
              title: (s as any).title as string,
              tag: (s as any).tag as string,
            })) as Array<{ id: string; title: string; tag: string }>)
        : [];

      const askedSuggestionIds = Array.isArray(parsed.askedSuggestionIds)
        ? (parsed.askedSuggestionIds.filter((x) => typeof x === 'string') as string[])
        : [];

      return { kbCourseIds, kbUnitIds, messages, suggestions, askedSuggestionIds };
    } catch {
      return null;
    }
  }

  function saveConversationCache(
    conversationId: string,
    payload: { kbCourseIds: string[]; kbUnitIds: string[]; messages: any[]; suggestions: any[] },
  ) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        cacheKey(conversationId),
        JSON.stringify({
          expiresAt: Date.now() + CACHE_TTL_MS,
          kbCourseIds: payload.kbCourseIds,
          kbUnitIds: payload.kbUnitIds,
          messages: Array.isArray(payload.messages) ? payload.messages.slice(-200) : [],
          suggestions: Array.isArray(payload.suggestions) ? payload.suggestions.slice(-20) : [],
          askedSuggestionIds: askedSuggestionIds.slice(-50),
        }),
      );
    } catch {}
  }

  useEffect(() => {
    if (!selectedConversationId) return;
    setKbApplied(false);
    setKbApplying(false);
    setKbError(null);
    setKbApplyingTitle('Preparing Knowledge base....');
    setKbApplyingDescription('Preparing your knowledge base and generating suggestions.');
    setKbChangeNotice(null);
    setKbRecentlyRemovedCourseIds([]);
    setKbRecentlyRemovedUnitIds([]);
    setKbRecentlyRemovedAt(null);
    setKbCourses([]);
    setKbCoursesLoading(false);
    setKbCoursesError(null);
    setKbSelectedCourseIds([]);
    setKbSelectedUnitIds([]);
    setKbAppliedCourseIds([]);
    setKbAppliedUnitIds([]);
    setCourseQuery('');
    setUnitQuery('');
    setKbUnitsByCourse({});
    setKbUnitsLoadingByCourse({});
    setMessages([]);
    setSuggestions([]);
    setAskedSuggestionIds([]);
    setSending(false);
    setChatInput('');
    setKbOpen(false);
    setSuggestOpen(false);

    const cached = loadConversationCache(selectedConversationId);
    if (cached) {
      setMessages(cached.messages);
      setSuggestions(cached.suggestions);
      setAskedSuggestionIds(cached.askedSuggestionIds);
      if (cached.kbUnitIds.length > 0) {
        setKbSelectedCourseIds(cached.kbCourseIds);
        setKbSelectedUnitIds(cached.kbUnitIds);
        setKbAppliedCourseIds(cached.kbCourseIds);
        setKbAppliedUnitIds(cached.kbUnitIds);
        setKbApplied(true);
      }
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;
    const el = messagesEndRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [selectedConversationId, messages.length, sending, kbApplying]);

  const selectedConversationKbUnitIds = useMemo(() => {
    if (!selectedConversation) return [];
    return selectedConversation.knowledge_base_learning_unit_ids ?? [];
  }, [selectedConversation]);

  const selectedConversationKbCourseIds = useMemo(() => {
    if (!selectedConversation) return [];
    return selectedConversation.knowledge_base_course_ids ?? [];
  }, [selectedConversation]);

  const selectedConversationKbKey = useMemo(() => {
    return [...selectedConversationKbUnitIds].sort().join(',');
  }, [selectedConversationKbUnitIds]);

  const selectedConversationKbCourseKey = useMemo(() => {
    return [...selectedConversationKbCourseIds].sort().join(',');
  }, [selectedConversationKbCourseIds]);

  useEffect(() => {
    if (!selectedConversationId) return;
    if (!selectedConversation) return;
    if (selectedConversationKbUnitIds.length === 0) return;
    setKbSelectedCourseIds(selectedConversationKbCourseIds);
    setKbAppliedCourseIds(selectedConversationKbCourseIds);
    setKbSelectedUnitIds(selectedConversationKbUnitIds);
    setKbAppliedUnitIds(selectedConversationKbUnitIds);
    setKbApplied(true);
    setKbOpen(false);
  }, [
    selectedConversationId,
    selectedConversation?.id,
    selectedConversationKbKey,
    selectedConversationKbCourseKey,
  ]);

  useEffect(() => {
    if (!selectedConversationId) return;
    saveConversationCache(selectedConversationId, {
      kbCourseIds: kbApplied ? kbAppliedCourseIds : [],
      kbUnitIds: kbApplied ? kbAppliedUnitIds : [],
      messages,
      suggestions,
    });
  }, [
    selectedConversationId,
    kbApplied,
    kbAppliedCourseIds,
    kbAppliedUnitIds,
    messages,
    suggestions,
    askedSuggestionIds,
  ]);

  useEffect(() => {
    if (!kbChangeNotice) return;
    const t = window.setTimeout(() => setKbChangeNotice(null), 2500);
    return () => window.clearTimeout(t);
  }, [kbChangeNotice]);

  useEffect(() => {
    if (!kbRecentlyRemovedAt) return;
    const t = window.setTimeout(() => {
      setKbRecentlyRemovedCourseIds([]);
      setKbRecentlyRemovedUnitIds([]);
      setKbRecentlyRemovedAt(null);
    }, 60_000);
    return () => window.clearTimeout(t);
  }, [kbRecentlyRemovedAt]);

  useEffect(() => {
    if (!selectedConversationId) return;
    if (kbApplied) return;
    if (!selectedConversation) return;
    const serverIds = selectedConversation.knowledge_base_learning_unit_ids ?? [];
    if (serverIds.length > 0) return;
    setKbOpen(true);
  }, [kbApplied, selectedConversation, selectedConversationId]);

  useEffect(() => {
    if (!kbOpen) return;
    let mounted = true;
    setKbCoursesLoading(true);
    setKbCoursesError(null);
    getMyCourses(1000, 0)
      .then((data) => {
        if (!mounted) return;
        setKbCourses(data);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setKbCoursesError(err instanceof Error ? err.message : 'Failed to load courses');
      })
      .finally(() => {
        if (!mounted) return;
        setKbCoursesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [kbOpen]);

  async function loadCourseMaterialUnits(courseId: string) {
    if (kbUnitsByCourse[courseId]) return;
    setKbUnitsLoadingByCourse((prev) => ({ ...prev, [courseId]: true }));
    try {
      const [units, summaries] = await Promise.all([
        getCourseLearningUnits(courseId, 10_000, 0),
        getCourseLearningUnitSummaries(courseId),
      ]);
      const withMaterials = new Set(
        summaries.filter((s: LearningUnitSummary) => s.material_count > 0).map((s) => s.unit_id),
      );
      const filtered = units
        .filter((u) => withMaterials.has(u.id))
        .sort((a, b) => a.unit_order - b.unit_order);
      setKbUnitsByCourse((prev) => ({ ...prev, [courseId]: filtered }));
    } finally {
      setKbUnitsLoadingByCourse((prev) => ({ ...prev, [courseId]: false }));
    }
  }

  useEffect(() => {
    if (!kbOpen) return;
    kbSelectedCourseIds.forEach((courseId) => {
      void loadCourseMaterialUnits(courseId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbOpen, kbSelectedCourseIds]);

  const kbOpenSnapshotRef = useRef<{ courseIds: string[]; unitIds: string[] } | null>(
    null,
  );

  const openKbModal = () => {
    const savedCourseIds = selectedConversation?.knowledge_base_course_ids ?? [];
    const savedUnitIds = selectedConversation?.knowledge_base_learning_unit_ids ?? [];

    const courseIds = savedCourseIds.length > 0 ? savedCourseIds : kbAppliedCourseIds;
    const unitIds = savedUnitIds.length > 0 ? savedUnitIds : kbAppliedUnitIds;

    kbOpenSnapshotRef.current = { courseIds: kbSelectedCourseIds, unitIds: kbSelectedUnitIds };
    setKbSelectedCourseIds(courseIds);
    setKbSelectedUnitIds(unitIds);
    setKbError(null);
    setKbOpen(true);
  };

  const closeKbModal = () => {
    const snapshot = kbOpenSnapshotRef.current;
    if (snapshot) {
      setKbSelectedCourseIds(snapshot.courseIds);
      setKbSelectedUnitIds(snapshot.unitIds);
    }
    kbOpenSnapshotRef.current = null;
    setKbError(null);
    setKbOpen(false);
  };

  const toggleCourse = (id: string) => {
    setKbSelectedCourseIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.includes(id)) {
        setKbRecentlyRemovedCourseIds((removed) => removed.filter((x) => x !== id));
      }
      return next;
    });
  };

  const selectAllCourses = () => setKbSelectedCourseIds(kbCourses.map((c) => c.id));
  const clearAllCourses = () => setKbSelectedCourseIds([]);

  const toggleUnit = (id: string) => {
    setKbSelectedUnitIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.includes(id)) {
        setKbRecentlyRemovedUnitIds((removed) => removed.filter((x) => x !== id));
      }
      return next;
    });
  };

  const filteredCourses = kbCourses.filter((c) =>
    c.title.toLowerCase().includes(courseQuery.toLowerCase()),
  );

  const availableUnits = kbSelectedCourseIds.flatMap((id) => kbUnitsByCourse[id] ?? []);

  const filteredUnits = availableUnits.filter((u) =>
    u.title.toLowerCase().includes(unitQuery.toLowerCase()),
  );

  function renderInlineMarkdown(text: string) {
    const nodes: Array<string | JSX.Element> = [];
    const re = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }
      nodes.push(<strong key={`${match.index}-${match[1]}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }
    return nodes;
  }

  function renderAssistantMarkdown(content: string) {
    const lines = content.split('\n');
    const blocks: Array<
      | { type: 'p'; text: string }
      | { type: 'ul'; items: string[] }
    > = [];

    let paraLines: string[] = [];
    let listItems: string[] = [];

    const flushPara = () => {
      const text = paraLines.join('\n').trim();
      if (text) blocks.push({ type: 'p', text });
      paraLines = [];
    };

    const flushList = () => {
      if (listItems.length > 0) blocks.push({ type: 'ul', items: listItems });
      listItems = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, '');
      if (!line.trim()) {
        flushPara();
        flushList();
        continue;
      }

      const bullet = line.match(/^\s*[*-]\s+(.*)$/);
      if (bullet) {
        flushPara();
        listItems.push(bullet[1].trim());
        continue;
      }

      flushList();
      paraLines.push(line);
    }

    flushPara();
    flushList();

    return (
      <div className="space-y-2">
        {blocks.map((b, idx) => {
          if (b.type === 'ul') {
            return (
              <ul key={`b-${idx}`} className="list-disc space-y-1 pl-5">
                {b.items.map((item, itemIdx) => (
                  <li key={`li-${idx}-${itemIdx}`}>{renderInlineMarkdown(item)}</li>
                ))}
              </ul>
            );
          }

          const parts = b.text.split('\n');
          return (
            <p key={`b-${idx}`} className="whitespace-pre-wrap">
              {parts.map((p, pIdx) => (
                <span key={`p-${idx}-${pIdx}`}>
                  {renderInlineMarkdown(p)}
                  {pIdx < parts.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          );
        })}
      </div>
    );
  }

  function parseSuggestions(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((x) => typeof x === 'string').slice(0, 10) as string[];
      }
    } catch {}
    const lines = trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^\d+[\).\-\s]+/, '').trim())
      .filter(Boolean);
    return lines.slice(0, 10);
  }

  async function applyKnowledgeBase() {
    if (kbApplying) return;
    setKbError(null);
    const prevCourseIds = kbAppliedCourseIds;
    const prevUnitIds = kbAppliedUnitIds;
    const nextCourseIds = kbSelectedCourseIds;
    const nextUnitIds = kbSelectedUnitIds;

    const removedCourseIds = prevCourseIds.filter((id) => !nextCourseIds.includes(id));
    const removedUnitIds = prevUnitIds.filter((id) => !nextUnitIds.includes(id));
    const addedCourseIds = nextCourseIds.filter((id) => !prevCourseIds.includes(id));
    const addedUnitIds = nextUnitIds.filter((id) => !prevUnitIds.includes(id));

    const kbChanged =
      removedCourseIds.length > 0 ||
      removedUnitIds.length > 0 ||
      addedCourseIds.length > 0 ||
      addedUnitIds.length > 0;

    if (nextUnitIds.length === 0) {
      setKbApplyingTitle('Removing Knowledge base....');
      setKbApplyingDescription('Clearing your selected knowledge base.');
    } else if (!kbApplied) {
      setKbApplyingTitle('Preparing Knowledge base....');
      setKbApplyingDescription('Preparing your knowledge base and generating suggestions.');
    } else {
      setKbApplyingTitle('Updating Knowledge base....');
      setKbApplyingDescription('Updating your knowledge base and generating suggestions.');
    }

    setKbApplying(true);
    try {
      if (selectedConversationId) {
        const updatedConv = await updateAIConversation(selectedConversationId, {
          knowledge_base_learning_unit_ids: nextUnitIds,
          knowledge_base_course_ids: nextCourseIds,
        });
        setConversations((prev) => prev.map((c) => (c.id === updatedConv.id ? updatedConv : c)));
      }

      setKbAppliedCourseIds(nextCourseIds);
      setKbAppliedUnitIds(nextUnitIds);
      setKbApplied(nextUnitIds.length > 0);

      if (kbChanged) {
        setKbRecentlyRemovedCourseIds(removedCourseIds);
        setKbRecentlyRemovedUnitIds(removedUnitIds);
        setKbRecentlyRemovedAt(Date.now());
      }

      kbOpenSnapshotRef.current = null;
      setKbOpen(false);

      if (nextUnitIds.length === 0) {
        setSuggestions([]);
        setAskedSuggestionIds([]);
        setKbChangeNotice('Knowledge base cleared');
        return;
      }

      if (!kbApplied) {
        setMessages([]);
        setSuggestions([]);

        const formattingRules =
          'Formatting rules (MUST follow):\n' +
          '- Output MUST be Markdown.\n' +
          '- Use section headings as plain text lines (NO bullet for headings).\n' +
          '- Under each heading, use a bulleted list with "-" (dash), not "*".\n' +
          '- For sub-points, use nested bullets with EXACTLY two leading spaces before "-".\n' +
          '  Example:\n' +
          '  - Main point\n' +
          '    - Sub point\n' +
          '- Add a blank line between sections.\n' +
          '- Use **bold** only for key labels (short phrases), not whole paragraphs.\n' +
          '- Do NOT use tables. Do NOT wrap the whole answer in a code block.\n' +
          '- Write in the same language as the knowledge base content.\n' +
          '- Do NOT add any preamble like "Here is the summary". Output the summary directly.\n';

        const summary = await answerAI({
          query:
            'Summarize the selected knowledge base for a lecturer.\n\n' +
            'Sections (in this order):\n' +
            '1) Tujuan Proyek\n' +
            '2) Ruang Lingkup & Fitur Utama\n' +
            '3) Metodologi & Manajemen Proyek\n' +
            '4) Fase Proyek & Durasi\n' +
            '5) Output/Deliverables\n\n' +
            'Keep it concise (max 12 top-level bullets total).\n\n' +
            formattingRules,
          top_k: 12,
          lens,
          learning_unit_ids: nextUnitIds,
        });
        setMessages([{ id: `m-${Date.now()}-summary`, role: 'assistant', content: summary.answer }]);
      }

      setSuggestions([]);
      const suggestionResp = await answerAI({
        query:
          'Generate 10 suggested questions a lecturer can ask based on the selected knowledge base.\n' +
          'Return ONLY a valid JSON array of strings.\n' +
          'No markdown. No explanation. No numbering. No extra keys.',
        top_k: 12,
        lens,
        learning_unit_ids: nextUnitIds,
      });
      const titles = parseSuggestions(suggestionResp.answer);
      setSuggestions(
        titles.slice(0, 10).map((t, idx) => ({
          id: `s-${idx}-${Date.now()}`,
          title: t,
          tag: 'suggestion',
        })),
      );
      setAskedSuggestionIds([]);

      setKbChangeNotice(kbChanged ? 'Knowledge base updated' : 'Knowledge base applied');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to apply knowledge base.';
      setKbError(msg);
      setKbAppliedCourseIds(prevCourseIds);
      setKbAppliedUnitIds(prevUnitIds);
      setKbApplied(prevUnitIds.length > 0);
      setKbOpen(true);
    } finally {
      setKbApplying(false);
    }
  }

  async function handleSend() {
    const q = chatInput.trim();
    if (!q) return;
    if (!kbApplied || kbApplying || sending) return;

    setSending(true);
    setChatInput('');
    const matchedSuggestion = suggestions.find((s) => s.title.trim() === q);
    if (matchedSuggestion) {
      setAskedSuggestionIds((prev) =>
        prev.includes(matchedSuggestion.id) ? prev : [...prev, matchedSuggestion.id],
      );
    }
    const now = Date.now();
    const userMsgId = `m-${now}-user`;
    const pendingMsgId = `m-${now}-assistant-pending`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: q },
      {
        id: pendingMsgId,
        role: 'assistant',
        content: 'Generating answer, please wait ...',
        pending: true,
      },
    ]);
    try {
      const resp = await answerAI({
        query: q,
        top_k: 10,
        lens,
        learning_unit_ids: kbAppliedUnitIds,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsgId ? { ...m, content: resp.answer, pending: false } : m,
        ),
      );
    } catch (err) {
      const msg =
        err instanceof Error ? `Error: ${err.message}` : 'Error: Failed to get response.';
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingMsgId ? { ...m, content: msg, pending: false } : m)),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <LecturerShell>
      <div className="flex h-full min-h-0 flex-col space-y-6 overflow-hidden">
        {!selectedConversationId ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-zinc-900">AI Chatbot</h1>
                <p className="mt-2 text-sm text-zinc-600">Start a new conversation or continue an old one</p>
              </div>
              <Button variant="outline" onClick={() => setCreateOpen(true)}>
                New Conversation
              </Button>
            </div>

            {conversationError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {conversationError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loadingConversations ? (
                <Card>
                  <div className="text-sm text-zinc-600">Loading conversations...</div>
                </Card>
              ) : conversations.length === 0 ? (
                <Card>
                  <div className="text-sm text-zinc-600">No conversations yet.</div>
                </Card>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className="group relative cursor-pointer rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow"
                    onClick={() => router.push(`/ai?conversationId=${c.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/ai?conversationId=${c.id}`);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-3xl">📚</div>
                      <div className="flex items-center gap-2 opacity-100 transition group-hover:opacity-100">
                        <button
                          type="button"
                          className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(c.id);
                            setRenameTitle(c.title);
                          }}
                          aria-label="Rename conversation"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(c.id);
                          }}
                          disabled={deleteLoadingId === c.id}
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {renamingId === c.id ? (
                      <div
                        className="mt-4 space-y-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          value={renameTitle}
                          onChange={(e) => setRenameTitle(e.target.value)}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRenamingId(null);
                              setRenameTitle('');
                            }}
                            disabled={renameLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRenameConversation(c.id)}
                            disabled={renameLoading}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 text-sm font-semibold text-zinc-900">
                          {truncateWords(c.title, 35)}
                        </div>
                        <div className="mt-2 text-xs text-zinc-600">
                          {formatConversationDate(c.created_at)}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {createOpen && (
              <div className="fixed inset-0 z-50">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setCreateOpen(false)}
                />
                <div className="absolute left-1/2 top-24 w-full max-w-lg -translate-x-1/2 rounded-xl bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                    <div className="text-base font-semibold text-zinc-900">
                      New Conversation
                    </div>
                    <button
                      className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100"
                      onClick={() => setCreateOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-4 px-6 py-4">
                    <Input
                      placeholder="Conversation title"
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-6 py-4">
                    <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateConversation} disabled={createLoading}>
                      Create
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-900"
                  onClick={() => router.push('/ai')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to conversations
                </button>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-zinc-700" />
                  <span className="text-sm font-semibold text-zinc-900">
                    {selectedConversation ? truncateWords(selectedConversation.title, 35) : 'Chat'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-zinc-600">
                <Settings className="h-4 w-4" />
                <Maximize2 className="h-4 w-4" />
              </div>
            </div>

            <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[1fr_24rem]">
              <div className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden">
                <Card
                  className="flex flex-1 min-h-0 flex-col overflow-hidden p-0"
                  bodyClassName="flex flex-1 min-h-0 flex-col overflow-hidden p-0"
                >
                  <div className="flex flex-1 min-h-0 flex-col">
                    <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-4">
                      {messages.length === 0 ? (
                        <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
                          {!kbApplied
                            ? 'Select a knowledge base to start chatting.'
                            : kbApplying
                              ? 'Preparing your knowledge base...'
                              : 'Ask a question about your selected courses and learning units.'}
                        </div>
                      ) : (
                        messages.map((m) => (
                          <div
                            key={m.id}
                            className={
                              m.role === 'user'
                                ? 'grid grid-cols-[1fr_2rem] items-end gap-2'
                                : 'grid grid-cols-[2rem_1fr] items-end gap-2'
                            }
                          >
                            {m.role === 'assistant' && (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
                                AI
                              </div>
                            )}
                            <div
                              className={`w-full rounded-2xl p-3 text-sm ${
                                m.role === 'user'
                                  ? 'bg-zinc-900 text-white'
                                  : 'bg-zinc-100 text-zinc-900'
                              }`}
                            >
                              {m.role === 'assistant'
                                ? m.pending
                                  ? (
                                      <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                                        <div>{m.content}</div>
                                      </div>
                                    )
                                  : renderAssistantMarkdown(m.content)
                                : m.content}
                            </div>
                            {m.role === 'user' && (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white">
                                U
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="space-y-3 border-t border-zinc-200 p-3">
                      <Input
                        placeholder="Ask a question about your selected courses and learning units..."
                        className="w-full"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleSend();
                          }
                        }}
                        disabled={!kbApplied || kbApplying || sending}
                      />
                      <div className="flex items-center justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => setSuggestOpen(true)}
                          disabled={!kbApplied || kbApplying}
                        >
                          <Lightbulb className="h-4 w-4" />
                          Suggestions
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => void handleSend()}
                          disabled={!kbApplied || kbApplying || sending || !chatInput.trim()}
                        >
                          <Send className="h-4 w-4" />
                          {sending ? 'Sending...' : 'Send'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex h-full flex-col space-y-4 overflow-hidden">
                <Card
                  title="Studio"
                  headerRight={<Maximize2 className="h-4 w-4 text-zinc-600" />}
                  className="flex-1"
                  bodyClassName="h-full"
                >
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Knowledge Base
                      </h3>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={openKbModal}
                          className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                        >
                          <span>
                            {kbApplied
                              ? `${kbAppliedCourseIds.length} course${
                                  kbAppliedCourseIds.length === 1 ? '' : 's'
                                }, ${kbAppliedUnitIds.length} unit${
                                  kbAppliedUnitIds.length === 1 ? '' : 's'
                                } selected`
                              : 'Select Knowledge Base'}
                          </span>
                          <ChevronDown className="h-4 w-4 text-zinc-600" />
                        </button>
                        {kbChangeNotice && (
                          <div
                            className={`mt-2 text-xs ${
                              kbChangeNotice.toLowerCase().includes('cleared')
                                ? 'text-red-700'
                                : 'text-green-700'
                            }`}
                          >
                            {kbChangeNotice}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Lens
                      </h3>
                      <div className="mt-3 space-y-2">
                        <select
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/5 focus-visible:ring-2"
                          value={lens}
                          onChange={(e) => setLens(e.target.value as Lens)}
                          disabled={sending || kbApplying}
                        >
                          <option value="default">Default</option>
                          <option value="academic">Academic</option>
                          <option value="feynman">Feynman</option>
                          <option value="practitioner">Practitioner</option>
                        </select>
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                      <h3 className="mb-3 text-sm font-semibold text-zinc-900">
                        Generate Knowledge
                      </h3>
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full" disabled>
                          Generate Flashcards
                        </Button>
                        <Button variant="outline" className="w-full" disabled>
                          Generate Quiz
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                      <Button variant="outline" className="w-full gap-2">
                        <Plus className="h-4 w-4" />
                        Add to Note
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}

        {kbOpen && (
            <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={closeKbModal}
            />
            <div className="absolute left-1/2 top-20 flex max-h-[calc(100vh-6rem)] w-full max-w-3xl -translate-x-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                <div>
                  <div className="text-base font-semibold text-zinc-900">
                    Select Knowledge Base
                  </div>
                  <div className="text-sm text-zinc-600">
                    Choose courses and learning units (with materials) to provide context
                  </div>
                </div>
                <button
                  className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100"
                  onClick={closeKbModal}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {(kbCoursesError || kbError) && (
                <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
                  {kbCoursesError || kbError}
                </div>
              )}
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden p-6 md:grid-cols-2">
                <div className="flex min-h-0 flex-col">
                  <div className="text-sm font-semibold text-zinc-900">
                    Courses
                  </div>
                  <div className="mt-3">
                    <Input
                      placeholder="Search courses..."
                      value={courseQuery}
                      onChange={(e) => setCourseQuery(e.target.value)}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="px-3 py-2"
                      onClick={selectAllCourses}
                      disabled={kbCoursesLoading || filteredCourses.length === 0}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      className="px-3 py-2"
                      onClick={clearAllCourses}
                      disabled={kbSelectedCourseIds.length === 0}
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {kbCoursesLoading ? (
                      <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
                        Loading courses...
                      </div>
                    ) : filteredCourses.length === 0 ? (
                      <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
                        No courses found.
                      </div>
                    ) : (
                      filteredCourses.map((c) => {
                        const checked = kbSelectedCourseIds.includes(c.id);
                        const recentlyRemoved = !checked && kbRecentlyRemovedCourseIds.includes(c.id);
                        const borderColor = checked
                          ? 'border-blue-300 bg-blue-50'
                          : recentlyRemoved
                            ? 'border-red-200 bg-red-50'
                            : 'border-zinc-200 bg-white';
                        return (
                          <label
                            key={c.id}
                            className={`flex items-start gap-3 rounded-lg border p-3 ${borderColor}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-zinc-300"
                              checked={checked}
                              onChange={() => toggleCourse(c.id)}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-zinc-900">
                                {c.title}
                              </div>
                              <div className="text-xs text-zinc-600">
                                {kbUnitsLoadingByCourse[c.id]
                                  ? 'Loading units...'
                                  : `${(kbUnitsByCourse[c.id] ?? []).length} unit${
                                      (kbUnitsByCourse[c.id] ?? []).length === 1 ? '' : 's'
                                    } with materials`}
                              </div>
                              {recentlyRemoved && (
                                <div className="mt-1 text-xs font-medium text-red-700">
                                  Recently removed
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="flex min-h-0 flex-col">
                  <div className="text-sm font-semibold text-zinc-900">
                    Learning Units
                  </div>
                  <div className="mt-3">
                    <Input
                      placeholder="Search learning units..."
                      value={unitQuery}
                      onChange={(e) => setUnitQuery(e.target.value)}
                      disabled={kbSelectedCourseIds.length === 0}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="border-green-200 bg-green-50 px-3 py-2 text-green-700 hover:bg-green-100"
                      onClick={() => setKbSelectedUnitIds(filteredUnits.map((u) => u.id))}
                      disabled={filteredUnits.length === 0}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      className="px-3 py-2"
                      onClick={() => setKbSelectedUnitIds([])}
                      disabled={kbSelectedUnitIds.length === 0}
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {kbSelectedCourseIds.length === 0 ? (
                      <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-zinc-200 bg-white">
                        <div className="text-center text-sm text-zinc-600">
                          <Lightbulb className="mx-auto mb-2 h-6 w-6 text-zinc-500" />
                          Select one or more courses to see learning units with materials
                        </div>
                      </div>
                    ) : filteredUnits.length === 0 ? (
                      <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
                        No learning units with materials found.
                      </div>
                    ) : (
                      filteredUnits.map((u) => {
                        const courseTitle =
                          kbCourses.find((c) => c.id === u.course_id)?.title ?? 'Course';
                        const checked = kbSelectedUnitIds.includes(u.id);
                        const recentlyRemoved = !checked && kbRecentlyRemovedUnitIds.includes(u.id);
                        const borderColor = checked
                          ? 'border-blue-300 bg-blue-50'
                          : recentlyRemoved
                            ? 'border-red-200 bg-red-50'
                            : 'border-zinc-200 bg-white';
                        return (
                          <label
                            key={u.id}
                            className={`flex items-start gap-3 rounded-lg border p-3 ${borderColor}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-zinc-300"
                              checked={checked}
                              onChange={() => toggleUnit(u.id)}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-zinc-900">
                                {u.title}
                              </div>
                              <div className="truncate text-xs text-zinc-600">
                                from {courseTitle}
                              </div>
                              {recentlyRemoved && (
                                <div className="mt-1 text-xs font-medium text-red-700">
                                  Recently removed
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-6 py-4">
                <div className="text-sm text-zinc-600">
                  {kbSelectedCourseIds.length} course
                  {kbSelectedCourseIds.length !== 1 ? 's' : ''},{' '}
                  {kbSelectedUnitIds.length} unit
                  {kbSelectedUnitIds.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={closeKbModal}>
                    Cancel
                  </Button>
                  <Button onClick={() => void applyKnowledgeBase()} disabled={kbApplying}>
                    {kbApplying ? 'Applying...' : 'Apply Selection'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {kbApplying && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                <div className="text-sm font-semibold text-zinc-900">{kbApplyingTitle}</div>
              </div>
              <div className="mt-2 text-sm text-zinc-600">
                {kbApplyingDescription}
              </div>
            </div>
          </div>
        )}

        {suggestOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSuggestOpen(false)}
            />
            <div className="absolute left-1/2 top-24 w-full max-w-2xl -translate-x-1/2 rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-zinc-700" />
                  <div className="text-base font-semibold text-zinc-900">
                    Suggested Questions
                  </div>
                </div>
                <button
                  className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100"
                  onClick={() => setSuggestOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[24rem] space-y-3 overflow-y-auto px-6 py-4">
                {suggestions.length === 0 ? (
                  <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                    No suggestions yet. Apply a knowledge base to generate them.
                  </div>
                ) : (
                  suggestions.map((s, idx) => {
                    const asked = askedSuggestionIds.includes(s.id);
                    return (
                    <button
                      key={s.id}
                      type="button"
                      className={`flex w-full items-start justify-between rounded-lg border p-4 text-left hover:bg-zinc-50 ${
                        asked ? 'border-green-200 bg-green-50' : 'border-zinc-200 bg-white'
                      }`}
                      onClick={() => {
                        setChatInput(s.title);
                        setSuggestOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-semibold ${
                            asked ? 'bg-green-600 text-white' : 'bg-zinc-900 text-white'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-zinc-900">
                            {s.title}
                          </div>
                          <div className="mt-2 inline-flex rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
                            {s.tag}
                          </div>
                        </div>
                      </div>
                    </button>
                    );
                  })
                )}
              </div>
              <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4">
                <div className="text-sm text-zinc-600">
                  {suggestions.length} question{suggestions.length === 1 ? '' : 's'} available
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSuggestOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LecturerShell>
  );
}
