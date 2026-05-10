import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Pause, Play, CheckCircle2, XCircle, ChevronDown, Loader2 } from "lucide-react"
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
  isLoading?: boolean
}

type PrimaryAction = "submit" | "give_up"

export function ActionBar({ status, onPause, onResume, onSubmit, onGiveUp, isLoading = false }: ActionBarProps) {
  const navigate = useNavigate()
  const [primaryAction, setPrimaryAction] = useState<PrimaryAction>("submit")

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
          My Tasks
        </Button>
      </div>
    )
  }

  const isActive = status === "active"
  const isSubmit = primaryAction === "submit"

  const actionBgClass = isSubmit
    ? "bg-green-600 hover:bg-green-700 text-white"
    : "bg-red-600 hover:bg-red-700 text-white"

  return (
    <div className="flex w-full items-center justify-end gap-3">
      {/* Pause / Resume */}
      <Button
        onClick={isActive ? onPause : onResume}
        disabled={isLoading}
        className={cn(
          "gap-2 text-sm border-0",
          isActive
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-primary text-primary-foreground hover:opacity-90"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isActive ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {isActive ? "Pause" : "Resume"}
      </Button>

      {/* Split Button: Submit / Give up */}
      <div className="inline-flex rounded-md shadow-sm">
        <Button
          onClick={isSubmit ? onSubmit : onGiveUp}
          disabled={isLoading}
          className={cn(
            "gap-2 text-sm rounded-r-none border-r border-white/20 focus-visible:z-10",
            actionBgClass
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSubmit ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {isSubmit ? "Submit" : "Give up"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={isLoading}
              className={cn("px-2 rounded-l-none focus-visible:z-10", actionBgClass)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={() => setPrimaryAction("submit")}
              className="gap-2 focus:bg-green-50 focus:text-green-700"
            >
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Submit task
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setPrimaryAction("give_up")}
              className="gap-2 focus:bg-red-50 focus:text-red-700"
            >
              <XCircle className="h-4 w-4 text-red-600" />
              Give up
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}