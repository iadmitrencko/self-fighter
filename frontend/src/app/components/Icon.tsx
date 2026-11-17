// Line icons of the mockups. They are decoration: the text next to them or a label says the same.
// The toasts draw them without React (app/toast.ts).
export const ICON_PATHS = {
  back: 'M19 12H5M11 18l-6-6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12l5 5 9-10',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, className = 'icon' }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
