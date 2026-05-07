import { useNavigate } from "react-router-dom"
import { ArrowLeft, Pause, Play, CheckCircle2, XCircle, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TaskStatus } from "@/types/task"

interface ActionBarProps {
  status: TaskStatus
  onPause: () => void
  onResume: () => void
  onSubmit: () => void
  onGiveUp: () => void
}

export function ActionBar({ status, onPause, onResume, onSubmit, onGiveUp }: ActionBarProps) {
  const navigate = useNavigate()
  const isReadOnly = status === "submitted" || status === "given_up"

  if (isReadOnly) {
    return (
      <div className="flex w-full justify-end">
        <Button
          variant="outline"
          className="gap-2 text-sm"
          onClick={() => navigate("/tasks")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Tasks
        </Button>
      </div>
    )
  }

  const isActive = status === "active"

  return (
    <div className="flex w-full items-center justify-end gap-2">
      {/* Pause / Resume */}
      <Button
        onClick={isActive ? onPause : onResume}
        className={cn(
          "gap-2 text-sm border-0",
          isActive
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-primary text-primary-foreground hover:opacity-90"
        )}
      >
        {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {isActive ? "Pause" : "Resume"}
      </Button>

      {/* Submit / Give up dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Submit
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={onSubmit}
            className="gap-2 text-primary focus:text-primary"
          >
            <CheckCircle2 className="h-4 w-4" />
            Submit task
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onGiveUp}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <XCircle className="h-4 w-4" />
            Give up
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}