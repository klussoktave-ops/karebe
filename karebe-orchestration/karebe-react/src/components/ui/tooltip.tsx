import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProviderProps {
  children: React.ReactNode
}

const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  return <>{children}</>
}

interface TooltipProps {
  children: React.ReactNode
}

const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { isOpen, setIsOpen })
        }
        return child
      })}
    </div>
  )
}

interface TooltipTriggerProps {
  children: React.ReactNode
}

const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children }) => {
  return <>{children}</>
}

interface TooltipContentProps {
  children: React.ReactNode
  className?: string
}

const TooltipContent: React.FC<TooltipContentProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg",
        "-top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap",
        "after:content-[''] after:absolute after:top-full after:left-1/2",
        "after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-900",
        className
      )}
    >
      {children}
    </div>
  )
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }
