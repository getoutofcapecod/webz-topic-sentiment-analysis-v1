import { AlertTriangleIcon } from "@/components/icons";

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-4 text-sm leading-relaxed text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
