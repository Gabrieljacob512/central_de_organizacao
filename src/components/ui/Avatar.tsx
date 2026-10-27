import { useState } from 'react';
import { getInitials } from '../../utils/format';

const GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
];

function gradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
} as const;

interface AvatarProps {
  name: string | null;
  avatarUrl?: string | null;
  size?: keyof typeof SIZES;
}

/** Avatar com suporte a imagem de foto de perfil e fallback gracioso para iniciais com gradiente. */
export function Avatar({ name, avatarUrl, size = 'sm' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  if (!name && !avatarUrl) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-slate-600 text-slate-500 ${SIZES[size]}`}
        title="Sem identificação"
      >
        ?
      </span>
    );
  }

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar do usuário'}
        onError={() => setImageError(true)}
        className={`inline-block shrink-0 rounded-full object-cover shadow-xs border border-slate-200 dark:border-slate-700 ${SIZES[size]}`}
      />
    );
  }

  const safeName = name || 'Usuário';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-linear-to-br font-semibold text-white shadow-md shadow-black/20 ${gradientFor(
        safeName,
      )} ${SIZES[size]}`}
      title={safeName}
    >
      {getInitials(safeName)}
    </span>
  );
}
