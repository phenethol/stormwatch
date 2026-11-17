import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({ title, onClose, children, busy = false, className }: { title: string; onClose: () => void; children: ReactNode; busy?: boolean; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const viewport = window.visualViewport
    const updateViewport = () => {
      if (!viewport || viewport.scale !== 1) return
      element.style.setProperty('--dialog-viewport-top', `${viewport.offsetTop}px`)
      element.style.setProperty('--dialog-viewport-height', `${viewport.height}px`)
    }
    updateViewport()
    element.showModal()
    viewport?.addEventListener('resize', updateViewport)
    viewport?.addEventListener('scroll', updateViewport)
    return () => {
      viewport?.removeEventListener('resize', updateViewport)
      viewport?.removeEventListener('scroll', updateViewport)
      element.close()
    }
  }, [])
  return <dialog ref={dialog} className={className} aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <header className="modal-bar"><h2>{title}</h2><button type="button" className="icon-button" disabled={busy} onClick={onClose} aria-label="Zatvori"><X size={19} /></button></header>
    <div className="modal-content">{children}</div>
  </dialog>
}
