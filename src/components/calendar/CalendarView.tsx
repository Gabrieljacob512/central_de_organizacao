import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Lock,
  Plus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CreateEventInput } from '../../hooks/useCalendarEvents';
import type { CalendarEvent, EventScope } from '../../types/calendar';
import type { UserProfile } from '../../types/ticket';
import {
  buildMonthMatrix,
  CATEGORY_LABELS,
  formatFullEventDate,
  formatMonthYearHeader,
  getEventScopeBadge,
  getWeekdayNamesShort,
} from '../../utils/calendar';
import { EventDetailsModal } from './EventDetailsModal';
import { EventFormModal } from './EventFormModal';

interface CalendarViewProps {
  currentUser: UserProfile | null;
  events: CalendarEvent[];
  canCreateGlobal: boolean;
  onCreateEvent: (input: CreateEventInput) => { success: boolean; error?: string };
  onDeleteEvent: (eventId: string) => { success: boolean; error?: string };
}

export function CalendarView({
  currentUser,
  events,
  canCreateGlobal,
  onCreateEvent,
  onDeleteEvent,
}: CalendarViewProps) {
  // Estado do Mês Selecionado (data base)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Filtro de Escopo: 'all' | 'global' | 'private'
  const [scopeFilter, setScopeFilter] = useState<'all' | EventScope>('all');

  // Modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<string | undefined>(undefined);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<CalendarEvent | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Eventos filtrados pelo seletor de escopo
  const filteredEvents = useMemo(() => {
    if (scopeFilter === 'all') return events;
    return events.filter((e) => e.scope === scopeFilter);
  }, [events, scopeFilter]);

  // Matriz de células para o mês atual
  const calendarDays = useMemo(() => {
    return buildMonthMatrix(year, month, filteredEvents);
  }, [year, month, filteredEvents]);

  // Estatísticas do Mês Atual
  const monthStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthEvents = events.filter((e) => e.date.startsWith(monthPrefix));
    const globalCount = monthEvents.filter((e) => e.scope === 'global').length;
    const privateCount = monthEvents.filter((e) => e.scope === 'private').length;
    return {
      total: monthEvents.length,
      global: globalCount,
      private: privateCount,
    };
  }, [events, year, month]);

  // Navegação
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateForCreate(dateStr);
    setCreateModalOpen(true);
  };

  const handleOpenGeneralCreate = () => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedDateForCreate(today);
    setCreateModalOpen(true);
  };

  const weekdays = getWeekdayNamesShort();

  return (
    <div className="space-y-6">
      {/* Cards de Métricas do Mês */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
              Total no Mês
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{monthStats.total}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Compromissos agendados</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center">
            <CalendarIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-2xs flex items-center justify-between dark:bg-slate-900 dark:border-blue-900/40">
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Globais (Corporativo)
            </p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">{monthStats.global}</p>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">Visíveis para toda a empresa</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-2xs flex items-center justify-between dark:bg-slate-900 dark:border-purple-900/40">
          <div>
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Meus Privados
            </p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-200 mt-1">{monthStats.private}</p>
            <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-0.5">Apenas no seu espaço seguro</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Controles: Navegação de Mês, Filtro de Escopo e Botão Novo Evento */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 dark:bg-slate-900 dark:border-slate-800">
        {/* Navegação de Mês */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
              className="p-2 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 border-x border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Próximo mês"
              className="p-2 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white capitalize tracking-tight ml-2">
            {formatMonthYearHeader(year, month)}
          </h2>
        </div>

        {/* Filtros e Ação */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scopeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('global')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scopeFilter === 'global'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'hover:text-blue-700 dark:hover:text-blue-400'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Globais
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('private')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scopeFilter === 'private'
                  ? 'bg-purple-600 text-white shadow-xs font-semibold'
                  : 'hover:text-purple-700 dark:hover:text-purple-400'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Privados
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenGeneralCreate}
            className="btn-primary min-h-[40px] px-3.5 py-2 text-xs font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Evento
          </button>
        </div>
      </div>

      {/* Grade do Calendário Mensal */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        {/* Cabeçalho dos Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 py-3">
          {weekdays.map((day, idx) => (
            <div
              key={day}
              className={idx === 0 || idx === 6 ? 'text-slate-400 font-medium' : 'text-slate-700 dark:text-slate-200'}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Dias do Mês (Grade 7 colunas) */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
          {calendarDays.map((cell) => {
            const isToday = cell.isToday;

            return (
              <div
                key={cell.dateString}
                onClick={() => handleDayClick(cell.dateString)}
                className={`min-h-[110px] md:min-h-[135px] p-2 flex flex-col justify-between transition-colors cursor-pointer group hover:bg-blue-50/30 dark:hover:bg-blue-950/20 ${
                  cell.isCurrentMonth
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-slate-50/60 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600'
                }`}
              >
                {/* Cabeçalho do dia */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-semibold rounded-full w-6 h-6 ${
                      isToday
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : cell.isCurrentMonth
                        ? 'text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Lista de Eventos no dia */}
                <div className="mt-1.5 space-y-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                  {cell.events.slice(0, 3).map((event) => {
                    const isGlobal = event.scope === 'global';
                    const badge = getEventScopeBadge(event.scope);

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEventForDetails(event);
                        }}
                        className={`w-full text-left px-1.5 py-1 rounded text-[11px] font-medium leading-tight truncate border flex items-center gap-1 transition-transform hover:scale-[1.02] shadow-2xs cursor-pointer ${badge.badgeClass}`}
                        title={`${event.title} (${isGlobal ? 'Corporativo' : 'Pessoal'})`}
                      >
                        {isGlobal ? (
                          <Globe className="w-3 h-3 shrink-0" />
                        ) : (
                          <Lock className="w-3 h-3 shrink-0" />
                        )}
                        <span className="truncate">{event.title}</span>
                      </button>
                    );
                  })}

                  {cell.events.length > 3 && (
                    <div className="text-[10px] font-medium text-slate-500 pl-1">
                      +{cell.events.length - 3} mais
                    </div>
                  )}
                </div>

                <div />
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de Agenda Mensal (Especialmente útil em telas mobile e visão rápida) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 md:p-6 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Agenda Detalhada do Mês
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {filteredEvents.length} compromisso(s)
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Nenhum compromisso cadastrado para este período.</p>
            <p className="text-xs text-slate-400 mt-1">
              Clique em "+ Novo Evento" ou diretamente em qualquer dia da grade para agendar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((ev) => {
              const isGlobal = ev.scope === 'global';
              const badge = getEventScopeBadge(ev.scope);

              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEventForDetails(ev)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-all cursor-pointer gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isGlobal
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400'
                      }`}
                    >
                      {isGlobal ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {ev.title}
                        </h4>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {CATEGORY_LABELS[ev.category]}
                        </span>
                      </div>

                      {ev.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs text-slate-600 dark:text-slate-400 sm:text-right">
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatFullEventDate(ev.date)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {ev.time ? `${ev.time}h` : 'Dia todo'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Criação de Evento */}
      <EventFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={onCreateEvent}
        initialDate={selectedDateForCreate}
        canCreateGlobal={canCreateGlobal}
      />

      {/* Modal de Detalhes do Evento */}
      <EventDetailsModal
        open={Boolean(selectedEventForDetails)}
        onClose={() => setSelectedEventForDetails(null)}
        event={selectedEventForDetails}
        currentUser={currentUser}
        onDelete={(id) => onDeleteEvent(id)}
      />
    </div>
  );
}
