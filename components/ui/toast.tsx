'use client'

import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, CheckCircle2, AlertCircle, Info, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-6 right-6 z-[100] flex max-h-screen w-full flex-col gap-2 sm:max-w-[380px]',
      className,
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  [
    'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden',
    'rounded-2xl border p-4 shadow-2xl',
    'transition-all duration-300',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[swipe=end]:animate-out data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
    'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
    'data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
    'data-[state=open]:slide-in-from-bottom-full',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-[#1e3a28] border-[#2a5c3a]',
          'text-white',
          'shadow-[0_8px_32px_rgba(30,58,40,0.4)]',
        ].join(' '),
        destructive: [
          'bg-[#2d1515] border-[#5c2a2a]',
          'text-white',
          'shadow-[0_8px_32px_rgba(90,20,20,0.4)]',
        ].join(' '),
        success: [
          'bg-[#1e3a28] border-[#2a5c3a]',
          'text-white',
          'shadow-[0_8px_32px_rgba(30,58,40,0.4)]',
        ].join(' '),
        info: [
          'bg-[#1a2840] border-[#2a4070]',
          'text-white',
          'shadow-[0_8px_32px_rgba(20,40,80,0.4)]',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

// Icon map per variant
const variantIcon: Record<string, React.ReactNode> = {
  default: <CheckCircle2 className="w-5 h-5 text-[#6ee89a] flex-shrink-0 mt-0.5" />,
  success: <CheckCircle2 className="w-5 h-5 text-[#6ee89a] flex-shrink-0 mt-0.5" />,
  destructive: <AlertCircle className="w-5 h-5 text-[#f87171] flex-shrink-0 mt-0.5" />,
  info: <Info className="w-5 h-5 text-[#60a5fa] flex-shrink-0 mt-0.5" />,
}

// Accent bar color per variant
const variantAccent: Record<string, string> = {
  default: 'bg-[#6ee89a]',
  success: 'bg-[#6ee89a]',
  destructive: 'bg-[#f87171]',
  info: 'bg-[#60a5fa]',
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
  const v = variant ?? 'default'

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {/* Left accent bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl', variantAccent[v as string])} />

      {/* Icon */}
      <div className="pl-2">
        {variantIcon[v as string]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-white/20',
      'bg-white/10 px-3 text-xs font-medium text-white',
      'transition-colors hover:bg-white/20',
      'focus:outline-none focus:ring-1 focus:ring-white/40',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-3 top-3 rounded-lg p-1',
      'text-white/40 hover:text-white/90',
      'opacity-0 transition-all group-hover:opacity-100',
      'focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-white/30',
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold text-white leading-snug', className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-xs text-white/65 mt-0.5 leading-relaxed', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}