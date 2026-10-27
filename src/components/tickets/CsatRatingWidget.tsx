import { Check, Star } from 'lucide-react';
import { useState } from 'react';
import { submitCsat } from '../../services/differentiatorsService';
import { useToast } from '../../hooks/useToast';

interface CsatRatingWidgetProps {
  ticketId: string;
  initialRating?: number | null;
  initialComment?: string | null;
  onRated?: (rating: number, comment?: string) => void;
}

export function CsatRatingWidget({
  ticketId,
  initialRating,
  initialComment,
  onRated,
}: CsatRatingWidgetProps) {
  const toast = useToast();
  const [rating, setRating] = useState<number>(initialRating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState(initialComment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(initialRating));

  const handleSend = async () => {
    if (rating === 0) {
      toast.error('Avaliação necessária', 'Selecione de 1 a 5 estrelas para avaliar.');
      return;
    }

    setIsSubmitting(true);
    const res = await submitCsat(ticketId, rating, comment);
    setIsSubmitting(false);

    if (res.success) {
      setSubmitted(true);
      toast.success('Avaliação enviada!', 'Muito obrigado pelo seu feedback sobre o atendimento.');
      onRated?.(rating, comment);
    } else {
      toast.error('Erro ao enviar avaliação', res.error);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-2xs dark:border-amber-900/60 dark:bg-amber-950/20">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
          Avaliação de Satisfação (CSAT)
        </h4>
        {submitted && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Avaliado
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-400/80">
        {submitted
          ? 'Obrigado por ajudar a Tecno System a aprimorar seus serviços.'
          : 'Como você avalia a resolução deste chamado? Sua opinião é fundamental.'}
      </p>

      {/* Estrelas */}
      <div className="mt-2.5 flex items-center gap-1.5" role="radiogroup" aria-label="Nota de 1 a 5">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = (hoverRating || rating) >= star;
          return (
            <button
              key={star}
              type="button"
              disabled={submitted}
              onMouseEnter={() => !submitted && setHoverRating(star)}
              onMouseLeave={() => !submitted && setHoverRating(0)}
              onClick={() => !submitted && setRating(star)}
              className={`p-1 rounded-lg transition-transform ${
                !submitted ? 'cursor-pointer hover:scale-115 active:scale-95' : 'cursor-default'
              }`}
              title={`${star} estrela${star > 1 ? 's' : ''}`}
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  active
                    ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                    : 'text-slate-300 dark:text-slate-700'
                }`}
              />
            </button>
          );
        })}
      </div>

      {!submitted && (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Deixe um comentário sobre o atendimento (opcional)..."
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-amber-500 dark:border-amber-800 dark:bg-slate-900 dark:text-slate-200"
            maxLength={200}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSend}
              disabled={isSubmitting || rating === 0}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
          </div>
        </div>
      )}

      {submitted && comment && (
        <p className="mt-2 text-xs italic text-slate-600 dark:text-slate-400">
          "{comment}"
        </p>
      )}
    </div>
  );
}
