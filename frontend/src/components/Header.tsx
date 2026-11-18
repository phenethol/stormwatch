import { FileText, Map, Menu, Moon, Plus, Sun, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type View = 'map' | 'reports'
export function Header({
  dark, onTheme, onHome, onAccount, onMyReports, onReport, account, view
}: {
  dark: boolean
  onTheme: () => void
  onHome: () => void
  onAccount: () => void
  onMyReports: () => void
  onReport: () => void
  account: boolean
  view: View
}) {
  const [menu, setMenu] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menu) return

    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setMenu(false)
    }

    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false)
    }

    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)

    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [menu])

  return (
    <header className="masthead">
      <a href="/" className="brand" aria-label="StormWatch, početna karta"
        onClick={event => {
          event.preventDefault()
          onHome()
        }}
      >
        <img src="/storm.svg" width="37" height="37" alt="" />
        <span>StormWatch</span>
      </a>

      <nav aria-label="Glavna navigacija">
        <NavItems view={view} onHome={onHome} onMyReports={onMyReports} />
      </nav>

      <div className="header-tools">
        <button type="button" className="header-icon"
          aria-label={dark ? 'Uključi svijetlu temu' : 'Uključi tamnu temu'}
          onClick={onTheme}
        >
          {dark ? <Sun size={19} /> : <Moon size={18} />}
        </button>

        <button type="button" className="header-icon account-button"
          aria-label={account ? 'Moj račun' : 'Korisnički račun'}
          onClick={onAccount}
        >
          <UserRound size={18} />
          <span>{account ? 'Račun' : 'Prijava'}</span>
        </button>

        <button type="button" className="primary header-report"
          aria-label="Nova prijava" onClick={onReport}
        >
          <Plus size={18} aria-hidden />
          <span>Nova prijava</span>
        </button>

        <div className="menu" ref={root}>
          <button ref={menuButton} type="button" className="header-icon menu-button"
            aria-label="Izbornik" aria-expanded={menu} aria-controls="main-menu"
            onClick={() => setMenu(value => !value)}
          >
            <Menu size={20} />
          </button>

          {menu && (
            <div id="main-menu" className="nav-menu" role="navigation" aria-label="Izbornik pregleda">
              <NavItems view={view} onHome={onHome} onMyReports={onMyReports}
                close={() => {
                  menuButton.current?.focus()
                  setMenu(false)
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function NavItems({
  view, onHome, onMyReports, close
}: {
  view: View
  onHome: () => void
  onMyReports: () => void
  close?: () => void
}) {
  return (
    <>
      <button type="button" className={view === 'map' ? 'nav-current' : undefined}
        aria-current={view === 'map' ? 'page' : undefined}
        onClick={() => {
          close?.()
          onHome()
        }}
      >
        <Map size={16} aria-hidden /> Karta
      </button>

      <button type="button" className={view === 'reports' ? 'nav-current' : undefined}
        aria-current={view === 'reports' ? 'page' : undefined}
        onClick={() => {
          close?.()
          onMyReports()
        }}
      >
        <FileText size={16} aria-hidden /> Moje prijave
      </button>
    </>
  )
}
