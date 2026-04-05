const sizes = {
  sm:      'w-4 h-4 border-2',
  default: 'w-8 h-8 border-2',
  lg:      'w-12 h-12 border-4',
};

export default function Spinner({ size = 'default' }) {
  return (
    <div
      className={`${sizes[size]} rounded-full border-slate-600 border-t-teal-400 animate-spin`}
    />
  );
}
