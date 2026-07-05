import { useState } from 'react'

interface ImageWithFallbackProps {
  src: string
  alt: string
  fallback: React.ReactNode
  className?: string
}

export function ImageWithFallback({
  src,
  alt,
  fallback,
  className,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return <>{fallback}</>
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  )
}
