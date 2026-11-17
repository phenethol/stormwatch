import { LogIn, LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { googleLogin, loadAccountInfo, signup, signOut, type Session } from '../services/authApi'
import { useResource } from '../services/useResource'
import { Modal } from './Modal'

/** Sign-in, first registration and, for a signed-in user, the compact "Moj račun" window. */
export function AccountDialog({ session, onClose, onChange }: { session: Session; onClose: () => void; onChange: (signedOut?: boolean) => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const run = async (action: () => Promise<unknown>, signedOut?: boolean) => {
    setError(''); setBusy(true)
    try { await action(); onChange(signedOut) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Radnja s računom nije uspjela.') }
    finally { setBusy(false) }
  }
  const outcome = new URLSearchParams(window.location.search).get('racun')
  const returned = outcome !== null
  return <Modal title={session === 'signup' ? 'Dovrši registraciju' : session === 'account' ? 'Moj račun' : 'Prijava'} onClose={onClose} busy={busy}
    className={session === 'account' ? 'account-dialog' : undefined}>
    <div className="account-content">
      {error && <p className="inline-note error" role="alert">{error}</p>}
      {session === 'account' ? <>
        <Profile />
        <button type="button" className="secondary" disabled={busy} onClick={() => void run(signOut, true)}><LogOut size={17} /> Odjava</button>
      </>
        : session === 'signup' ? <form className="report-form" onSubmit={event => { event.preventDefault(); if (accepted && !busy) void run(() => signup(name)) }}>
          <label>Korisničko ime<input required autoComplete="username" minLength={3} maxLength={30} pattern={'[A-Za-z0-9_.\\-]+'} value={name} onChange={event => setName(event.target.value)} /></label>
          <details className="filters"><summary>Obavijest o privatnosti</summary><p className="privacy-text">Pri prijavi Google računom sustav dobiva adresu e-pošte radi povezivanja korisničkog računa. Korisničko ime prikazuje se uz prijave, a opažanja sadrže unesenu lokaciju, vrijeme i opis. Prijave mogu biti vidljive drugim korisnicima prema svojem stanju. Ovaj tekst tim treba provjeriti i dopuniti prije javne objave.</p></details>
          <label className="checkbox"><input type="checkbox" required checked={accepted} onChange={event => setAccepted(event.target.checked)} /> Pročitao/la sam obavijest o privatnosti.</label>
          <button type="submit" className="primary" disabled={!accepted || busy}>Dovrši registraciju</button>
        </form> : <>
          <span className="account-icon"><UserRound size={25} /></span>
          <p>Prijavite se Google računom kako biste predali opažanje i pregledali vlastite prijave.</p>
          {outcome === 'greska' && <p className="inline-note error" role="alert">Google prijava nije uspjela ili je otkazana. Pokušajte ponovno.</p>}
          {returned && outcome !== 'greska' && <p className="inline-note">Ako prijava nije dovršena, pokušajte se ponovno prijaviti.</p>}
          <button type="button" className="primary" disabled={busy} onClick={() => void run(googleLogin)}><LogIn size={17} /> Prijavi se Google računom</button>
        </>}
    </div>
  </Modal>
}

function Profile() {
  const user = useResource(loadAccountInfo)
  return <>
    {user.error && <p className="inline-note error" role="alert">{user.error} <button type="button" className="text-button" onClick={user.refresh}>Pokušaj ponovno</button></p>}
    <div className="profile-head">
      <span className="avatar"><UserRound size={31} aria-hidden /></span>
      <div>
        <h3>{user.data ? user.data.username || 'Nije dostupno' : user.error ? 'Nije dostupno' : 'Učitavanje…'}</h3>
        {user.data && <p>{user.data.email || 'E-mail nije dostupan'}</p>}
      </div>
    </div>
  </>
}
