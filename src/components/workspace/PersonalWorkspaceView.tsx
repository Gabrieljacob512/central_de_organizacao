import {
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Copy,
  FileText,
  Lock,
  Plus,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useId, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import type { CalendarEvent, PersonalTask, TaskPriority } from '../../types/calendar';
import type { UserProfile } from '../../types/ticket';
import { formatFullEventDate } from '../../utils/calendar';

interface PersonalWorkspaceViewProps {
  currentUser: UserProfile | null;
  notes: string;
  tasks: PersonalTask[];
  privateEvents: CalendarEvent[];
  updatedAt: string;
  onUpdateNotes: (notes: string) => void;
  onAddTask: (text: string, priority: TaskPriority, dueDate?: string) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onNavigateToCalendar: () => void;
}

export function PersonalWorkspaceView({
  currentUser,
  notes,
  tasks,
  privateEvents,
  updatedAt,
  onUpdateNotes,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onNavigateToCalendar,
}: PersonalWorkspaceViewProps) {
  const toast = useToast();
  const prioritySelectId = useId();

  // Estados locais para adicionar nova tarefa
  const [taskText, setTaskText] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('media');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Adicionar Tarefa
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) {
      toast.error('Informe a descrição da tarefa.');
      return;
    }
    onAddTask(taskText.trim(), taskPriority, taskDueDate || undefined);
    setTaskText('');
    setTaskDueDate('');
    toast.success('Tarefa adicionada ao seu espaço privado!');
  };

  // Copiar Notas
  const handleCopyNotes = async () => {
    if (!notes) {
      toast.info('Não há anotações para copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(notes);
      toast.success('Anotações copiadas para a área de transferência!');
    } catch {
      toast.error('Erro ao copiar notas.');
    }
  };

  // Filtragem de Tarefas
  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'pending') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const priorityStyles: Record<TaskPriority, { label: string; badge: string }> = {
    baixa: {
      label: 'Baixa',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    },
    media: {
      label: 'Média',
      badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    },
    alta: {
      label: 'Alta',
      badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    },
  };

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas e Privacidade */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-2xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wide border border-blue-200 dark:border-blue-900/60">
              <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Espaço Privado & Seguro</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Organização Pessoal de {currentUser?.name || 'Colaborador'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Suas anotações, tarefas individuais e lembretes são salvos exclusivamente no seu perfil
              local (<span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{`private_workspace_${currentUser?.email?.toLowerCase() || 'anon'}`}</span>).
              Nenhum outro colega tem acesso ao que você armazena aqui.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-slate-900 dark:text-white">Isolamento Ativo</p>
              <p className="text-slate-500 dark:text-slate-400">
                {updatedAt ? `Última sincronização: ${new Date(updatedAt).toLocaleTimeString()}` : 'Salvo no navegador'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Notas Pessoais & Tarefas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloco de Notas Pessoais */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 md:p-6 flex flex-col dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Anotações Rápidas</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Rascunhos, links e anotações de reunião</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyNotes}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Copiar texto"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar
            </button>
          </div>

          {/* Área de Texto com Auto-save */}
          <div className="flex-1 flex flex-col min-h-[300px]">
            <textarea
              value={notes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder="Digite aqui suas notas particulares, lembretes do dia, links úteis ou informações confidenciais..."
              className="w-full flex-1 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 outline-hidden text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none leading-relaxed transition-all font-sans"
            />

            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mt-2 px-1">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <Sparkles className="w-3 h-3" /> Salvo automaticamente
              </span>
              <span>
                {notes.length} caracteres • {notes.trim() ? notes.trim().split(/\s+/).length : 0} palavras
              </span>
            </div>
          </div>
        </div>

        {/* Checklist de Tarefas Individuais */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 md:p-6 flex flex-col dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Tarefas Individuais</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Sua lista de afazeres prioritários</p>
              </div>
            </div>

            {/* Barra de Progresso Compacta */}
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {completedCount}/{tasks.length} concluídas ({progressPercent}%)
              </span>
              <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Formulário de Adicionar Tarefa */}
          <form onSubmit={handleCreateTask} className="space-y-3 mb-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="O que você precisa fazer hoje?"
                className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 outline-hidden"
              />
              <button
                type="submit"
                className="btn-primary min-h-[40px] px-3.5 py-2 text-xs font-bold shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <label htmlFor={prioritySelectId} className="text-slate-500 dark:text-slate-400 font-medium">
                  Prioridade:
                </label>
                <select
                  id={prioritySelectId}
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 cursor-pointer"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Prazo:</span>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 cursor-pointer"
                />
              </div>
            </div>
          </form>

          {/* Filtros de Tarefas */}
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setTaskFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                taskFilter === 'all'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Todas ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter('pending')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                taskFilter === 'pending'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Pendentes ({tasks.length - completedCount})
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter('completed')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                taskFilter === 'completed'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Concluídas ({completedCount})
            </button>
          </div>

          {/* Lista de Tarefas */}
          <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2 pr-1 scrollbar-thin">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">
                  {taskFilter === 'completed'
                    ? 'Nenhuma tarefa concluída ainda.'
                    : 'Nenhuma tarefa pendente. Tudo em dia!'}
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const priorityInfo = priorityStyles[task.priority] || priorityStyles.media;

                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      task.completed
                        ? 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 opacity-60'
                        : 'bg-white dark:bg-slate-850 border-slate-200/90 dark:border-slate-750 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTask(task.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                      />
                      <span
                        className={`text-xs text-slate-800 dark:text-slate-200 break-words ${
                          task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'font-medium'
                        }`}
                      >
                        {task.text}
                      </span>
                    </label>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priorityInfo.badge}`}
                      >
                        {priorityInfo.label}
                      </span>

                      {task.dueDate && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {task.dueDate.split('-').reverse().slice(0, 2).join('/')}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded cursor-pointer"
                        title="Excluir tarefa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Seção Inferior: Próximos Compromissos Privados */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 md:p-6 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Seus Compromissos Privados</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Eventos salvos exclusivamente no seu calendário particular
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToCalendar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Abrir Calendário Completo
          </button>
        </div>

        {privateEvents.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Lock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-medium">Você ainda não tem compromissos privados cadastrados.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Acesse o Calendário para agendar reuniões particulares e lembretes com privacidade.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {privateEvents.slice(0, 6).map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 dark:bg-slate-800/40 dark:border-slate-750 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Privado
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{formatFullEventDate(ev.date)}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{ev.title}</h4>
                {ev.time && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {ev.time}h
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
