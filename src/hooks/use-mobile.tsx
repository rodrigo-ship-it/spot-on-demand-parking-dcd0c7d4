import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Safe check for window availability (SSR compatibility)
    if (typeof window === 'undefined') {
      console.log('useIsMobile: window not available (SSR)')
      return
    }

    console.log('useIsMobile: initializing mobile detection', {
      windowWidth: window.innerWidth,
      breakpoint: MOBILE_BREAKPOINT,
      userAgent: navigator.userAgent
    })

    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT
      console.log('useIsMobile: checking mobile state', {
        windowWidth: window.innerWidth,
        isMobile: mobile
      })
      setIsMobile(mobile)
      return mobile
    }

    // Initial check
    const initialMobile = checkMobile()

    // Set up media query listener
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      console.log('useIsMobile: media query changed')
      checkMobile()
    }
    
    mql.addEventListener("change", onChange)
    
    return () => {
      console.log('useIsMobile: cleaning up listeners')
      mql.removeEventListener("change", onChange)
    }
  }, [])

  // Log the current state
  React.useEffect(() => {
    console.log('useIsMobile: current state', { isMobile })
  }, [isMobile])

  // Return false by default to prevent hydration mismatches
  return isMobile ?? false
}
