export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        Loading garden…
      </p>
    </div>
  )
}