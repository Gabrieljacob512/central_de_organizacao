import { BookOpen, ChevronRight, Folder, Search, Tag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchKnowledgeBaseArticles, type KnowledgeArticle } from '../../services/differentiatorsService';

interface KnowledgeBaseModalProps {
  open: boolean;
  onClose: () => void;
}

export function KnowledgeBaseModal({ open, onClose }: KnowledgeBaseModalProps) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchKnowledgeBaseArticles().then(setArticles);
    }
  }, [open]);

  if (!open) return null;

  const categories = Array.from(new Set(articles.map((a) => a.category)));

  const filtered = articles.filter((a) => {
    const matchesSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase()) ||
      Boolean(a.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())));

    const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs dark:bg-slate-950/80" onClick={onClose} />

      <div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-scale-in"
        role="dialog"
        aria-labelledby="kb-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 id="kb-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Base de Conhecimento & FAQs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Procedimentos, políticas de atendimento e guias rápidos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Busca e Filtro de Categoria */}
        <div className="space-y-3 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artigos por palavra-chave ou tags (ex: senha, SLA, reembolso)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-9 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Todas as Categorias
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Artigos */}
        <div className="max-h-[50vh] overflow-y-auto space-y-2.5 pr-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhum artigo encontrado com os termos pesquisados.
            </div>
          ) : (
            filtered.map((art) => {
              const isExpanded = expandedId === art.id;
              return (
                <div
                  key={art.id}
                  className="rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-850"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : art.id)}
                    className="flex w-full items-center justify-between p-3.5 text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Folder className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {art.title}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {art.category}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/40">
                      <p className="whitespace-pre-wrap">{art.content}</p>

                      {art.tags && art.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          <Tag className="h-3 w-3 text-slate-400" />
                          {art.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-mono"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
