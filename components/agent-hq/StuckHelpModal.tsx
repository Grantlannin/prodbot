'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useStuckHelp } from './hooks/StuckHelpProvider';
import { useProjects } from './hooks/ProjectsProvider';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import type { ProjectBoard } from './types';
import {
  ORGANIZING_FLOW_COPY,
  STARTING_FLOW_COPY,
  STRUCTURE_FLOW_COPY,
  STUCK_HELP_OPTIONS,
  type OrganizingFlowPhase,
  type StartingFlowPhase,
  type StructureFlowPhase,
  type StuckHelpPath,
} from './stuckHelp/flows';
import {
  addProjectTask,
  getOpenProjectTaskTexts,
  mergeTaskTextOptions,
  requestFocusProject,
  upsertProject,
} from './stuckHelp/projectMutations';
import DailyStructureCalendar from './DailyStructureCalendar';
import StructureBlockForm from './stuckHelp/StructureBlockForm';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { CaptureNote } from './types';
import { localDateKey } from './eodReports';
import {
  createOpenLoopNote,
  DAILY_STRUCTURE_KEY,
  exportDayToGoogleCalendar,
  formatMinutesLabel,
  makeDayBlockId,
  RECURRING_COMMITMENTS_KEY,
  sortBlocks,
  upsertRecurringCommitment,
  upsertTodayPlan,
  type DailyStructureStore,
  type DayBlock,
  type DayBlockKind,
  type RecurringCommitment,
} from './stuckHelp/dailyStructureUtils';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const BOT_TYPING_MS = 1300;

const STARTING_COMPOSE_PHASES: StartingFlowPhase[] = ['await_task', 'await_prep_plan', 'await_chunks'];
const STARTING_YES_PHASES: StartingFlowPhase[] = ['await_prep_yes', 'await_chunk_yes'];

const ORGANIZING_COMPOSE_PHASES: OrganizingFlowPhase[] = [
  'await_project_name',
  'await_mvp_tasks',
];

function TypingBubble() {
  return (
    <div style={{ ...styles.msgRow, ...styles.msgRowBot }}>
      <div style={{ ...styles.bubble, ...styles.botBubble, ...styles.typingBubble }}>
        <span className="stuck-help-typing-dot" style={{ animationDelay: '0ms' }} />
        <span className="stuck-help-typing-dot" style={{ animationDelay: '150ms' }} />
        <span className="stuck-help-typing-dot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

const STRUCTURE_COMPOSE_PHASES: StructureFlowPhase[] = [];

export default function StuckHelpModal() {
  const {
    open,
    closeStuckHelp,
    startingFlow,
    organizingFlow,
    structureFlow,
    startStartingFlow,
    startOrganizingFlow,
    startStructureFlow,
    clearStartingFlow,
    setStartingPhase,
    setOrganizingPhase,
    setStructurePhase,
    setStartingFields,
    setOrganizingFields,
    setStructureBlocks,
    appendStartingMessages,
    appendOrganizingMessages,
    appendStructureMessages,
    resetStartingChat,
    resetOrganizingChat,
    resetStructureChat,
    postPrepResume,
    clearPostPrepResume,
    beginPrepTimer,
    beginWorkTimer,
  } = useStuckHelp();
  const { status } = useWorkTrackerContext();
  const { projects, setProjects } = useProjects();
  const [dailyStore, setDailyStore] = useLocalStorage<DailyStructureStore>(DAILY_STRUCTURE_KEY, {});
  const [recurringCommitments, setRecurringCommitments] = useLocalStorage<RecurringCommitment[]>(
    RECURRING_COMMITMENTS_KEY,
    []
  );
  const [openLoops, setOpenLoops] = useLocalStorage<CaptureNote[]>('agentHQ_openLoops', []);
  const [typing, setTyping] = useState(false);
  const [chooseProjectError, setChooseProjectError] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef('');
  const [draft, setDraft] = useState('');
  const flowFieldsRef = useRef({ importantTask: '', prepPlan: '', chunks: '' });
  const organizingFieldsRef = useRef({
    projectMode: null as 'choose' | 'input' | null,
    projectId: '',
    projectName: '',
    taskTexts: [] as string[],
    hardestTask: '',
  });
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const busy = status === 'working' || status === 'on_break';
  const inStarting = startingFlow !== null;
  const inOrganizing = organizingFlow !== null;
  const inStructure = structureFlow !== null;
  const inChat = inStarting || inOrganizing || inStructure;
  const startingPhase = startingFlow?.phase;
  const organizingPhase = organizingFlow?.phase;
  const structurePhase = structureFlow?.phase;
  const messages = inStarting
    ? (startingFlow?.messages ?? [])
    : inOrganizing
      ? (organizingFlow?.messages ?? [])
      : (structureFlow?.messages ?? []);
  const structureBlocks = structureFlow?.blocks ?? [];
  const showStructureCalendar =
    inStructure && structurePhase != null && structurePhase !== 'await_commitments';
  const openLoopCount = structureBlocks.filter(block => block.kind === 'open_loop').length;

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!organizingFlow?.projectId) return;
    const exists = projects.some(project => project.id === organizingFlow.projectId);
    if (exists) return;

    organizingFieldsRef.current.projectId = '';
    organizingFieldsRef.current.projectName = '';
    organizingFieldsRef.current.taskTexts = [];
    organizingFieldsRef.current.hardestTask = '';
    setOrganizingFields({
      projectId: '',
      projectName: '',
      taskTexts: [],
      hardestTask: '',
    });

    const earlyPhases = new Set<OrganizingFlowPhase>([
      'await_project_mode',
      'await_project_pick',
      'await_project_name',
    ]);
    if (!earlyPhases.has(organizingFlow.phase)) {
      setOrganizingPhase('await_project_mode');
    }
  }, [organizingFlow?.phase, organizingFlow?.projectId, projects, setOrganizingFields, setOrganizingPhase]);

  useEffect(() => {
    if (!open) {
      clearTimers();
      setTyping(false);
      setDraft('');
      draftRef.current = '';
      setChooseProjectError(false);
    }
  }, [open]);

  useEffect(() => {
    if (!inChat) return;
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, startingPhase, organizingPhase, structurePhase, inChat, typing]);

  const sendStartingBotReply = (
    text: string,
    typingMs = BOT_TYPING_MS,
    link?: { label: string; href: string }
  ) => {
    setTyping(true);
    schedule(() => {
      appendStartingMessages({ role: 'bot', text, ...(link ? { link } : {}) });
      setTyping(false);
    }, typingMs);
  };

  const sendOrganizingBotReply = (text: string, typingMs = BOT_TYPING_MS) => {
    setTyping(true);
    schedule(() => {
      appendOrganizingMessages({ role: 'bot', text });
      setTyping(false);
    }, typingMs);
  };

  const sendStartingOpeningSequence = (first: string, second: string) => {
    clearTimers();
    setTyping(true);
    schedule(() => {
      appendStartingMessages({ role: 'bot', text: first });
      schedule(() => {
        appendStartingMessages({ role: 'bot', text: second });
        setTyping(false);
      }, BOT_TYPING_MS);
    }, BOT_TYPING_MS);
  };

  const sendOrganizingOpeningSequence = (first: string, second: string) => {
    clearTimers();
    setTyping(true);
    schedule(() => {
      appendOrganizingMessages({ role: 'bot', text: first });
      schedule(() => {
        appendOrganizingMessages({ role: 'bot', text: second });
        setTyping(false);
      }, BOT_TYPING_MS);
    }, BOT_TYPING_MS);
  };

  const sendStructureBotReply = (text: string, typingMs = BOT_TYPING_MS) => {
    setTyping(true);
    schedule(() => {
      appendStructureMessages({ role: 'bot', text });
      setTyping(false);
    }, typingMs);
  };

  const sendStructureOpeningSequence = (first: string, second: string) => {
    clearTimers();
    setTyping(true);
    schedule(() => {
      appendStructureMessages({ role: 'bot', text: first });
      schedule(() => {
        appendStructureMessages({ role: 'bot', text: second });
        setTyping(false);
      }, BOT_TYPING_MS);
    }, BOT_TYPING_MS);
  };

  const persistStructureBlocks = (blocks: DayBlock[]) => {
    const sorted = sortBlocks(blocks);
    setStructureBlocks(sorted);
    setDailyStore(prev => upsertTodayPlan(prev, sorted, localDateKey()));
  };

  const addStructureBlock = (
    kind: DayBlockKind,
    title: string,
    startMinutes: number,
    durationMinutes: number,
    options?: { singleTime?: boolean }
  ) => {
    if (typing) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const singleTime = !!options?.singleTime && kind === 'open_loop';

    const block: DayBlock = {
      id: makeDayBlockId(),
      title: trimmed,
      startMinutes,
      durationMinutes,
      kind,
    };

    if (kind === 'open_loop') {
      const note = createOpenLoopNote(trimmed, startMinutes, durationMinutes, localDateKey(), singleTime);
      block.openLoopId = note.id;
      setOpenLoops(prev => [note, ...prev]);
    }

    if (kind === 'commitment') {
      setRecurringCommitments(prev => upsertRecurringCommitment(prev, block));
    }

    const timeLabel = singleTime
      ? `at ${formatMinutesLabel(startMinutes)}`
      : `${formatMinutesLabel(startMinutes)} – ${formatMinutesLabel(startMinutes + durationMinutes)}`;

    const next = sortBlocks([...structureBlocks, block]);
    appendStructureMessages({
      role: 'user',
      text: `${trimmed} (${timeLabel})`,
    });
    persistStructureBlocks(next);
  };

  const addRecurringCommitmentBlock = (item: RecurringCommitment) => {
    addStructureBlock('commitment', item.title, item.startMinutes, item.durationMinutes);
  };

  const finishCommitments = () => {
    if (typing) return;
    appendStructureMessages({ role: 'user', text: STRUCTURE_FLOW_COPY.doneCommitments });
    clearTimers();
    setTyping(true);
    schedule(() => {
      appendStructureMessages({ role: 'bot', text: STRUCTURE_FLOW_COPY.openLoopsIntro });
      schedule(() => {
        appendStructureMessages({ role: 'bot', text: STRUCTURE_FLOW_COPY.qOpenLoops });
        setTyping(false);
        setStructurePhase('await_open_loops');
      }, BOT_TYPING_MS);
    }, BOT_TYPING_MS);
  };

  const finishOpenLoops = () => {
    if (typing) return;
    appendStructureMessages({ role: 'user', text: STRUCTURE_FLOW_COPY.doneOpenLoops });
    sendStructureBotReply(STRUCTURE_FLOW_COPY.workIntro);
    setStructurePhase('await_work_blocks');
  };

  const skipOpenLoops = () => {
    if (typing) return;
    appendStructureMessages({ role: 'user', text: STRUCTURE_FLOW_COPY.noOpenLoops });
    sendStructureBotReply(STRUCTURE_FLOW_COPY.workIntro);
    setStructurePhase('await_work_blocks');
  };

  const finishStructureDay = () => {
    if (typing) return;
    appendStructureMessages({ role: 'user', text: STRUCTURE_FLOW_COPY.dayLooksGreat });
    sendStructureBotReply(STRUCTURE_FLOW_COPY.organizingHint);
    setStructurePhase('await_finish');
  };

  const addToGoogleCalendar = () => {
    if (typing || structureBlocks.length === 0) return;
    appendStructureMessages({ role: 'user', text: STRUCTURE_FLOW_COPY.addToGoogleCalendar });
    exportDayToGoogleCalendar(structureBlocks, localDateKey());
  };

  const handleStructureBlocksChange = (blocks: DayBlock[]) => {
    persistStructureBlocks(blocks);
  };

  useEffect(() => {
    if (!open || !postPrepResume || !startingFlow) return;
    clearPostPrepResume();
    sendStartingBotReply(STARTING_FLOW_COPY.qChunks);
  }, [open, postPrepResume, startingFlow, clearPostPrepResume]);

  useEffect(() => {
    if (!open || !inStarting || !startingPhase || STARTING_YES_PHASES.includes(startingPhase) || typing) return;
    if (!STARTING_COMPOSE_PHASES.includes(startingPhase)) return;
    inputRef.current?.focus();
  }, [open, inStarting, startingPhase, messages.length, typing]);

  useEffect(() => {
    if (!open || !inOrganizing || !organizingPhase || typing) return;
    if (!ORGANIZING_COMPOSE_PHASES.includes(organizingPhase)) return;
    inputRef.current?.focus();
  }, [open, inOrganizing, organizingPhase, messages.length, typing]);

  if (!open || typeof document === 'undefined') return null;

  const hide = () => closeStuckHelp();

  const backToPicker = () => {
    clearTimers();
    setTyping(false);
    clearStartingFlow();
    setDraft('');
    draftRef.current = '';
    flowFieldsRef.current = { importantTask: '', prepPlan: '', chunks: '' };
    organizingFieldsRef.current = {
      projectMode: null,
      projectId: '',
      projectName: '',
      taskTexts: [],
      hardestTask: '',
    };
    setChooseProjectError(false);
  };

  const pickPath = (id: StuckHelpPath) => {
    if (id === 'starting') {
      flowFieldsRef.current = { importantTask: '', prepPlan: '', chunks: '' };
      startStartingFlow();
      setDraft('');
      draftRef.current = '';
      sendStartingOpeningSequence(STARTING_FLOW_COPY.intro, STARTING_FLOW_COPY.q1);
      return;
    }
    if (id === 'organizing') {
      organizingFieldsRef.current = {
      projectMode: null,
      projectId: '',
      projectName: '',
      taskTexts: [],
      hardestTask: '',
    };
      startOrganizingFlow();
      setDraft('');
      draftRef.current = '';
      sendOrganizingOpeningSequence(ORGANIZING_FLOW_COPY.intro, ORGANIZING_FLOW_COPY.qProject);
      return;
    }
    if (id === 'structure') {
      startStructureFlow();
      setDraft('');
      draftRef.current = '';
      sendStructureOpeningSequence(STRUCTURE_FLOW_COPY.intro, STRUCTURE_FLOW_COPY.qCommitments);
    }
  };

  const selectOrganizingProject = (project: ProjectBoard) => {
    if (typing) return;
    const name = project.name.trim() || 'Unnamed project';
    organizingFieldsRef.current.projectMode = 'choose';
    organizingFieldsRef.current.projectId = project.id;
    organizingFieldsRef.current.projectName = name;
    organizingFieldsRef.current.taskTexts = [];
    setOrganizingFields({
      projectMode: 'choose',
      projectId: project.id,
      projectName: name,
      taskTexts: [],
    });
    appendOrganizingMessages({ role: 'user', text: name });
    requestFocusProject(project.id);
    sendOrganizingBotReply(ORGANIZING_FLOW_COPY.qMvp);
    setOrganizingPhase('await_mvp_tasks');
    setDraft('');
    draftRef.current = '';
  };

  const beginChooseProject = () => {
    if (typing) return;
    const options = projects.filter(p => p.name.trim());
    if (options.length === 0) {
      setChooseProjectError(true);
      return;
    }
    setChooseProjectError(false);
    organizingFieldsRef.current.projectMode = 'choose';
    setOrganizingFields({ projectMode: 'choose' });
    appendOrganizingMessages({ role: 'user', text: ORGANIZING_FLOW_COPY.chooseProject });
    setOrganizingPhase('await_project_pick');
    setDraft('');
    draftRef.current = '';
  };

  const beginInputProject = () => {
    if (typing) return;
    setChooseProjectError(false);
    organizingFieldsRef.current.projectMode = 'input';
    setOrganizingFields({ projectMode: 'input' });
    setOrganizingPhase('await_project_name');
    setDraft('');
    draftRef.current = '';
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const addOrganizingTaskText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nextTasks = [...(organizingFlow?.taskTexts ?? organizingFieldsRef.current.taskTexts), trimmed];
    organizingFieldsRef.current.taskTexts = nextTasks;
    setOrganizingFields({ taskTexts: nextTasks });
  };

  const selectExistingProjectTask = (taskText: string) => {
    if (typing) return;
    const trimmed = taskText.trim();
    if (!trimmed) return;
    const current = organizingFlow?.taskTexts ?? organizingFieldsRef.current.taskTexts;
    if (current.includes(trimmed)) return;
    appendOrganizingMessages({ role: 'user', text: trimmed });
    addOrganizingTaskText(trimmed);
  };

  const sendStartingDraft = () => {
    const text = draft.trim();
    if (!text || typing || !startingPhase) return;

    appendStartingMessages({ role: 'user', text });
    setDraft('');
    draftRef.current = '';

    if (startingPhase === 'await_task') {
      flowFieldsRef.current.importantTask = text;
      setStartingFields({ importantTask: text });
      const courseUrl = STARTING_FLOW_COPY.prepCourseUrl.trim();
      if (courseUrl) {
        sendStartingBotReply(STARTING_FLOW_COPY.q2, BOT_TYPING_MS, {
          label: STARTING_FLOW_COPY.q2CourseLinkLabel,
          href: courseUrl,
        });
      } else {
        sendStartingBotReply(STARTING_FLOW_COPY.q2 + STARTING_FLOW_COPY.q2CourseLinkLabel);
      }
      setStartingPhase('await_prep_plan');
      return;
    }

    if (startingPhase === 'await_prep_plan') {
      flowFieldsRef.current.prepPlan = text;
      setStartingFields({ prepPlan: text });
      sendStartingBotReply(STARTING_FLOW_COPY.prepReady);
      setStartingPhase('await_prep_yes');
      return;
    }

    if (startingPhase === 'await_chunks') {
      flowFieldsRef.current.chunks = text;
      setStartingFields({ chunks: text });
      sendStartingBotReply(STARTING_FLOW_COPY.chunkWorkReady);
      setStartingPhase('await_chunk_yes');
    }
  };

  const sendOrganizingDraft = () => {
    const text = draft.trim();
    if (!text || typing || !organizingPhase) return;

    if (organizingPhase === 'await_project_name') {
      let project!: ProjectBoard;
      setProjects(prev => {
        const result = upsertProject(prev, text);
        project = result.project;
        return result.projects;
      });
      organizingFieldsRef.current.projectMode = 'input';
      organizingFieldsRef.current.projectId = project.id;
      organizingFieldsRef.current.projectName = project.name.trim();
      organizingFieldsRef.current.taskTexts = [];
      setOrganizingFields({
        projectMode: 'input',
        projectId: project.id,
        projectName: project.name.trim(),
        taskTexts: [],
      });
      appendOrganizingMessages({ role: 'user', text: project.name.trim() });
      requestFocusProject(project.id);
      sendOrganizingBotReply(ORGANIZING_FLOW_COPY.qMvp);
      setOrganizingPhase('await_mvp_tasks');
      setDraft('');
      draftRef.current = '';
      return;
    }

    if (organizingPhase === 'await_mvp_tasks') {
      const projectId = organizingFlow?.projectId || organizingFieldsRef.current.projectId;
      if (!projectId) return;
      appendOrganizingMessages({ role: 'user', text });
      setProjects(prev => addProjectTask(prev, projectId, text));
      requestFocusProject(projectId);
      addOrganizingTaskText(text);
      setDraft('');
      draftRef.current = '';
    }
  };

  const finishAddingTasks = () => {
    const chatTasks = organizingFlow?.taskTexts ?? organizingFieldsRef.current.taskTexts;
    const projectId = organizingFlow?.projectId || organizingFieldsRef.current.projectId;
    const project = projects.find(p => p.id === projectId);
    const projectTasks = getOpenProjectTaskTexts(project);
    const tasks = mergeTaskTextOptions(projectTasks, chatTasks);
    if (!tasks.length || typing) return;
    organizingFieldsRef.current.taskTexts = tasks;
    setOrganizingFields({ taskTexts: tasks });
    appendOrganizingMessages({ role: 'user', text: ORGANIZING_FLOW_COPY.doneAddingTasks });
    sendOrganizingBotReply(ORGANIZING_FLOW_COPY.qHardest);
    setOrganizingPhase('await_hardest_pick');
  };

  const pickHardestTask = (task: string) => {
    if (typing) return;
    organizingFieldsRef.current.hardestTask = task;
    setOrganizingFields({ hardestTask: task });
    appendOrganizingMessages({ role: 'user', text: task });
    sendOrganizingBotReply(ORGANIZING_FLOW_COPY.prepManual);
    setOrganizingPhase('await_manual_prep');
  };

  const finishManualPrep = () => {
    if (typing) return;
    appendOrganizingMessages({ role: 'user', text: ORGANIZING_FLOW_COPY.donePrepping });
    sendOrganizingBotReply(ORGANIZING_FLOW_COPY.kickstartReady);
    setOrganizingPhase('await_kickstart_yes');
  };

  const sendStartingYes = () => {
    if (!startingPhase || !startingFlow) return;

    if (startingPhase === 'await_prep_yes') {
      if (typing) return;
      const task = (startingFlow.importantTask || flowFieldsRef.current.importantTask).trim();
      const prep = (startingFlow.prepPlan || flowFieldsRef.current.prepPlan).trim();
      if (!task || !prep) return;
      appendStartingMessages({ role: 'user', text: STARTING_FLOW_COPY.yesBegin });
      beginPrepTimer(task, prep);
      return;
    }

    if (startingPhase === 'await_chunk_yes') {
      if (typing || busy) return;
      const task = (startingFlow.importantTask || flowFieldsRef.current.importantTask).trim();
      const chunks = (startingFlow.chunks || flowFieldsRef.current.chunks).trim();
      if (!task || !chunks) return;
      appendStartingMessages({ role: 'user', text: STARTING_FLOW_COPY.yesBegin });
      beginWorkTimer(task, chunks);
    }
  };

  const sendOrganizingKickstart = () => {
    if (!organizingPhase || !organizingFlow || organizingPhase !== 'await_kickstart_yes') return;
    if (typing || busy) return;
    const projectName = (organizingFlow.projectName || organizingFieldsRef.current.projectName).trim();
    const hardest = (organizingFlow.hardestTask || organizingFieldsRef.current.hardestTask).trim();
    if (!projectName || !hardest) return;
    appendOrganizingMessages({ role: 'user', text: ORGANIZING_FLOW_COPY.kickstartYes });
    beginWorkTimer(hardest, projectName);
  };

  const sendDraft = () => {
    if (inStarting) sendStartingDraft();
    else if (inOrganizing) sendOrganizingDraft();
  };

  const clearChatLabel = inStructure
    ? STRUCTURE_FLOW_COPY.clearChat
    : ORGANIZING_FLOW_COPY.clearChat;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendDraft();
    }
  };

  const clearChat = () => {
    clearTimers();
    setTyping(false);
    setDraft('');
    draftRef.current = '';

    if (inOrganizing) {
      organizingFieldsRef.current = {
        projectMode: null,
        projectId: '',
        projectName: '',
        taskTexts: [],
        hardestTask: '',
      };
      setChooseProjectError(false);
      resetOrganizingChat();
      sendOrganizingOpeningSequence(ORGANIZING_FLOW_COPY.intro, ORGANIZING_FLOW_COPY.qProject);
      return;
    }

    if (inStructure) {
      resetStructureChat();
      sendStructureOpeningSequence(STRUCTURE_FLOW_COPY.intro, STRUCTURE_FLOW_COPY.qCommitments);
      return;
    }

    if (inStarting) {
      flowFieldsRef.current = { importantTask: '', prepPlan: '', chunks: '' };
      resetStartingChat();
      sendStartingOpeningSequence(STARTING_FLOW_COPY.intro, STARTING_FLOW_COPY.q1);
    }
  };

  const showStartingCompose =
    inStarting && startingPhase
      ? STARTING_COMPOSE_PHASES.includes(startingPhase) && !typing
      : false;
  const showOrganizingCompose =
    inOrganizing && organizingPhase
      ? ORGANIZING_COMPOSE_PHASES.includes(organizingPhase) && !typing
      : false;
  const showStructureCompose =
    inStructure && structurePhase
      ? STRUCTURE_COMPOSE_PHASES.includes(structurePhase) && !typing
      : false;
  const showCompose = showStartingCompose || showOrganizingCompose || showStructureCompose;

  const showStartingYes =
    inStarting && !inOrganizing && startingPhase
      ? STARTING_YES_PHASES.includes(startingPhase) && !typing
      : false;

  const projectOptions = projects.filter(p => p.name.trim());
  const organizingTasks = organizingFlow?.taskTexts ?? [];
  const selectedProject = projects.find(p => p.id === organizingFlow?.projectId);
  const projectTaskTexts = getOpenProjectTaskTexts(selectedProject);
  const hardestPickOptions = mergeTaskTextOptions(projectTaskTexts, organizingTasks);
  const existingProjectTasks = projectTaskTexts.filter(taskText => !organizingTasks.includes(taskText));

  return createPortal(
    <>
      <style>{`
        @keyframes stuckHelpTypingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .stuck-help-typing-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          margin: 0 2px;
          border-radius: 50%;
          background: #8e8e93;
          animation: stuckHelpTypingBounce 1.2s infinite ease-in-out;
        }
      `}</style>
      <div style={styles.backdrop} onClick={e => e.target === e.currentTarget && hide()}>
        {!inChat ? (
          <div style={styles.menuCard} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={hide} style={styles.menuClose} aria-label="Close">
              ✕
            </button>
            <div style={styles.optionList}>
              {STUCK_HELP_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => pickPath(option.id)}
                  style={styles.optionBtn}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={showStructureCalendar ? styles.comboShell : styles.shell}
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.chatCol}>
            <header style={styles.header}>
              <button type="button" onClick={backToPicker} style={styles.headerBack}>
                ←
              </button>
              <div style={styles.headerCenter}>
                <div style={styles.avatar}>b</div>
                <span style={styles.headerTitle}>bot</span>
              </div>
              <div style={styles.headerRight}>
                <button type="button" onClick={clearChat} style={styles.headerClear}>
                  {clearChatLabel}
                </button>
                <button type="button" onClick={hide} style={styles.headerClose} aria-label="Close">
                  ✕
                </button>
              </div>
            </header>

            <div ref={threadRef} style={styles.thread}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.msgRow,
                    ...(msg.role === 'user' ? styles.msgRowUser : styles.msgRowBot),
                  }}
                >
                  <div
                    style={{
                      ...styles.bubble,
                      ...(msg.role === 'user' ? styles.userBubble : styles.botBubble),
                    }}
                  >
                    {msg.text}
                    {msg.link ? (
                      <>
                        {' '}
                        <a
                          href={msg.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.bubbleLink}
                        >
                          {msg.link.label}
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
              {typing ? <TypingBubble /> : null}
            </div>

            <footer style={styles.footer}>
              {inOrganizing && organizingPhase === 'await_project_mode' && !typing ? (
                <div style={styles.chipWrap}>
                  {chooseProjectError ? (
                    <p style={styles.errorText}>{ORGANIZING_FLOW_COPY.noSavedProjects}</p>
                  ) : null}
                  <button type="button" onClick={beginChooseProject} style={styles.chip}>
                    {ORGANIZING_FLOW_COPY.chooseProject}
                  </button>
                  <button type="button" onClick={beginInputProject} style={styles.chip}>
                    {ORGANIZING_FLOW_COPY.inputProject}
                  </button>
                </div>
              ) : null}

              {inOrganizing && organizingPhase === 'await_project_pick' && !typing && projectOptions.length > 0 ? (
                <div style={styles.chipWrap}>
                  {projectOptions.map(project => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => selectOrganizingProject(project)}
                      style={styles.chip}
                    >
                      {project.name.trim()}
                    </button>
                  ))}
                </div>
              ) : null}

              {inOrganizing && organizingPhase === 'await_mvp_tasks' && !typing && existingProjectTasks.length > 0 ? (
                <div style={styles.chipWrap}>
                  {existingProjectTasks.map(task => (
                    <button
                      key={task}
                      type="button"
                      onClick={() => selectExistingProjectTask(task)}
                      style={styles.chip}
                    >
                      {task}
                    </button>
                  ))}
                </div>
              ) : null}

              {inOrganizing && organizingPhase === 'await_hardest_pick' && !typing ? (
                <div style={styles.chipWrap}>
                  {hardestPickOptions.map(task => (
                    <button key={task} type="button" onClick={() => pickHardestTask(task)} style={styles.chip}>
                      {task}
                    </button>
                  ))}
                </div>
              ) : null}

              {inOrganizing && organizingPhase === 'await_mvp_tasks' && !typing && (organizingTasks.length > 0 || projectTaskTexts.length > 0) ? (
                <div style={styles.chipWrap}>
                  <button type="button" onClick={finishAddingTasks} style={styles.chip}>
                    {ORGANIZING_FLOW_COPY.doneAddingTasks}
                  </button>
                </div>
              ) : null}

              {inOrganizing && organizingPhase === 'await_manual_prep' && !typing ? (
                <div style={styles.chipWrap}>
                  <button type="button" onClick={finishManualPrep} style={styles.chip}>
                    {ORGANIZING_FLOW_COPY.donePrepping}
                  </button>
                </div>
              ) : null}

              {inOrganizing && organizingPhase === 'await_kickstart_yes' && !typing ? (
                <div style={styles.chipWrap}>
                  <button type="button" disabled={busy} onClick={sendOrganizingKickstart} style={styles.chip}>
                    {ORGANIZING_FLOW_COPY.kickstartYes}
                  </button>
                </div>
              ) : null}

              {showStartingYes ? (
                <div style={styles.chipWrap}>
                  <button type="button" disabled={busy} onClick={sendStartingYes} style={styles.chip}>
                    {STARTING_FLOW_COPY.yesBegin}
                  </button>
                </div>
              ) : null}

              {inStructure && structurePhase === 'await_commitments' && !typing ? (
                <>
                  {recurringCommitments.length > 0 ? (
                    <div style={styles.chipWrap}>
                      {recurringCommitments.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addRecurringCommitmentBlock(item)}
                          style={styles.chip}
                        >
                          {item.title} ({formatMinutesLabel(item.startMinutes)})
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <StructureBlockForm
                    namePlaceholder={STRUCTURE_FLOW_COPY.namePlaceholder}
                    timeRangePlaceholder={STRUCTURE_FLOW_COPY.timeRangePlaceholder}
                    quickEntryPlaceholder="Job 9am-5pm"
                    addLabel={STRUCTURE_FLOW_COPY.addBlock}
                    onAdd={(title, startMinutes, durationMinutes) =>
                      addStructureBlock('commitment', title, startMinutes, durationMinutes)
                    }
                  />
                  <div style={styles.chipWrap}>
                    <button type="button" onClick={finishCommitments} style={styles.chip}>
                      {STRUCTURE_FLOW_COPY.doneCommitments}
                    </button>
                  </div>
                </>
              ) : null}

              {inStructure && structurePhase === 'await_open_loops' && !typing ? (
                <>
                  <StructureBlockForm
                    namePlaceholder={STRUCTURE_FLOW_COPY.namePlaceholder}
                    timeRangePlaceholder={STRUCTURE_FLOW_COPY.openLoopTimePlaceholder}
                    quickEntryPlaceholder={STRUCTURE_FLOW_COPY.openLoopQuickEntryPlaceholder}
                    addLabel={STRUCTURE_FLOW_COPY.addBlock}
                    allowSingleTime
                    onAdd={(title, startMinutes, durationMinutes, options) =>
                      addStructureBlock('open_loop', title, startMinutes, durationMinutes, options)
                    }
                  />
                  <div style={styles.chipWrap}>
                    <button type="button" onClick={skipOpenLoops} style={styles.chip}>
                      {STRUCTURE_FLOW_COPY.noOpenLoops}
                    </button>
                    {openLoopCount > 0 ? (
                      <button type="button" onClick={finishOpenLoops} style={styles.chip}>
                        {STRUCTURE_FLOW_COPY.doneOpenLoops}
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}

              {inStructure && structurePhase === 'await_work_blocks' && !typing ? (
                <>
                  <StructureBlockForm
                    namePlaceholder={STRUCTURE_FLOW_COPY.namePlaceholder}
                    timeRangePlaceholder={STRUCTURE_FLOW_COPY.timeRangePlaceholder}
                    quickEntryPlaceholder="Deep work 10am-12pm"
                    addLabel={STRUCTURE_FLOW_COPY.addBlock}
                    onAdd={(title, startMinutes, durationMinutes) =>
                      addStructureBlock('work', title, startMinutes, durationMinutes)
                    }
                  />
                  <div style={styles.chipWrap}>
                    <button type="button" onClick={finishStructureDay} style={styles.chip}>
                      {STRUCTURE_FLOW_COPY.dayLooksGreat}
                    </button>
                  </div>
                </>
              ) : null}

              {inStructure && structurePhase === 'await_finish' && !typing ? (
                <div style={styles.chipWrap}>
                  <button
                    type="button"
                    disabled={structureBlocks.length === 0}
                    onClick={addToGoogleCalendar}
                    style={styles.chip}
                  >
                    {STRUCTURE_FLOW_COPY.addToGoogleCalendar}
                  </button>
                </div>
              ) : null}

              {showCompose ? (
                <div style={styles.compose}>
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={e => {
                      setDraft(e.target.value);
                      draftRef.current = e.target.value;
                    }}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder={
                      organizingPhase === 'await_project_name'
                        ? ORGANIZING_FLOW_COPY.projectNamePlaceholder
                        : inOrganizing && organizingPhase === 'await_mvp_tasks'
                          ? ORGANIZING_FLOW_COPY.addTaskPlaceholder
                          : 'Message'
                    }
                    style={styles.input}
                  />
                  <button
                    type="button"
                    disabled={!draft.trim()}
                    onClick={sendDraft}
                    style={{
                      ...styles.sendBtn,
                      ...(!draft.trim() ? styles.sendBtnDisabled : {}),
                    }}
                    aria-label="Send"
                  >
                    ↑
                  </button>
                </div>
              ) : null}
            </footer>
            </div>
            {showStructureCalendar ? (
              <div style={styles.calendarCol}>
                <DailyStructureCalendar
                  blocks={structureBlocks}
                  onBlocksChange={handleStructureBlocksChange}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 100000,
    fontFamily: font,
  },
  menuCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 480,
    maxHeight: '85vh',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    padding: '22px 20px',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)',
  },
  menuClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: 16,
    fontWeight: 700,
    fontFamily: font,
    cursor: 'pointer',
    padding: 4,
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 8,
  },
  optionBtn: {
    textAlign: 'left',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#f8fafc',
    color: '#0f172a',
    cursor: 'pointer',
    lineHeight: 1.45,
  },
  optionBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  shell: {
    width: '100%',
    maxWidth: 420,
    height: 'min(640px, 85vh)',
    background: '#f2f2f7',
    borderRadius: 20,
    border: '1px solid #d1d5db',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  comboShell: {
    width: '100%',
    maxWidth: 760,
    height: 'min(640px, 85vh)',
    background: '#f2f2f7',
    borderRadius: 20,
    border: '1px solid #d1d5db',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 0,
  },
  chatCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#f2f2f7',
  },
  calendarCol: {
    flexShrink: 0,
    padding: '12px 12px 12px 0',
    display: 'flex',
    alignItems: 'stretch',
    background: '#f2f2f7',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  headerBack: {
    border: 'none',
    background: 'transparent',
    color: '#007aff',
    fontSize: 18,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    width: 32,
    padding: 0,
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#0f172a',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textTransform: 'lowercase',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
    textTransform: 'lowercase',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerClear: {
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    padding: '4px 0',
    whiteSpace: 'nowrap',
    textTransform: 'lowercase',
  },
  headerClose: {
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: 16,
    fontWeight: 700,
    fontFamily: font,
    cursor: 'pointer',
    width: 32,
    padding: 0,
  },
  thread: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  msgRow: {
    display: 'flex',
    width: '100%',
  },
  msgRowBot: {
    justifyContent: 'flex-start',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    padding: '9px 13px',
    fontSize: 15,
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  botBubble: {
    background: '#e9e9eb',
    color: '#0f172a',
    borderRadius: '18px 18px 18px 4px',
  },
  bubbleLink: {
    color: '#007aff',
    fontWeight: 700,
    textDecoration: 'underline',
  },
  typingBubble: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 52,
    minHeight: 20,
    padding: '12px 14px',
  },
  userBubble: {
    background: '#007aff',
    color: '#fff',
    borderRadius: '18px 18px 4px 18px',
  },
  footer: {
    background: '#fff',
    borderTop: '1px solid #e5e7eb',
    padding: '10px 12px 12px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  chipWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  chip: {
    textAlign: 'center',
    border: '1px solid #007aff',
    borderRadius: 18,
    padding: '9px 13px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#007aff',
    cursor: 'pointer',
    lineHeight: 1.4,
  },
  errorText: {
    margin: 0,
    fontSize: 12,
    color: '#dc2626',
    textAlign: 'center',
    lineHeight: 1.45,
    padding: '2px 2px 0',
  },
  helperText: {
    margin: 0,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 1.45,
    padding: '4px 2px',
  },
  compose: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    background: '#f2f2f7',
    borderRadius: 22,
    padding: '6px 6px 6px 14px',
    border: '1px solid #e5e7eb',
  },
  input: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: 16,
    fontFamily: font,
    lineHeight: 1.4,
    resize: 'none',
    outline: 'none',
    maxHeight: 100,
    padding: '6px 0',
    color: '#0f172a',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 'none',
    background: '#007aff',
    color: '#fff',
    fontSize: 18,
    fontWeight: 800,
    fontFamily: font,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  sendBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
};
