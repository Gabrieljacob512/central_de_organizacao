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
} as const;

interface AvatarProps {
  name: string | null;
  size?: keyof typeof SIZES;
}

/** Avatar com iniciais e gradiente determinístico pelo nome. */
export function Avatar({ name, size = 'sm' }: AvatarProps) {
  if (!name) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-slate-600 text-slate-500 ${SIZES[size]}`}
        title="Sem responsável"
      >
        ?
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-linear-to-br font-semibold text-white shadow-md shadow-black/30 ${gradientFor(name)} ${SIZES[size]}`}
      title={name}
    >
      {getInitials(name)}
    </span>
  );
}
