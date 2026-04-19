import { CheckCircle2 } from 'lucide-react'

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed top-[72px] left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium shadow-lg whitespace-nowrap">
        <CheckCircle2 className="w-4 h-4 text-green-400" />
        {message}
      </div>
    </div>
  )
}
