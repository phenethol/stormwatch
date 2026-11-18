import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AccountDialog } from "./components/AccountDialog";
import { Header, type View } from './components/Header';
import { Page } from "./components/ui";
import { MapPage, type MapPageHandle } from "./pages/MapPage";
import ReportsPage from "./pages/ReportsPage";
import { loadSession } from "./services/authApi";
import { useResource } from "./services/useResource";

const reportsHash = "#/prijave";
const themeKey = "stormwatch-novi-theme";

const readView = (): View => window.location.hash === reportsHash ? "reports" : "map";

function subscribeHash(change: () => void) {
  window.addEventListener("hashchange", change);
  return () => window.removeEventListener("hashchange", change);
}

function navigate(hash: string) {
  if (hash) {
    window.location.hash = hash;
  } else if (window.location.hash) {
    history.pushState(null, "", window.location.pathname + window.location.search);
    window.dispatchEvent(new Event("hashchange"));
  }
}

function App() {
  const page = useSyncExternalStore(subscribeHash, readView);

  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(themeKey) === "dark";
    } catch {
      return false;
    }
  });

  const [accountOpen, setAccountOpen] = useState(
    () => new URLSearchParams(location.search).has("racun")
  );

  const [sessionRevision, setSessionRevision] = useState(0);
  const [signedOut, setSignedOut] = useState(false);

  const mapPage = useRef<MapPageHandle>(null);
  const session = useResource(loadSession, 60_000);
  const account = !signedOut && session.data === "account";

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";

    try {
      localStorage.setItem(themeKey, dark ? "dark" : "light");
    } catch {
      return;
    }
  }, [dark]);

  useEffect(() => {
    if (session.data === "account" && new URLSearchParams(window.location.search).has("racun")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
  }, [session.data]);

  const openAccount = () => setAccountOpen(true);

  return (
    <div className="app-shell">
      <Header
        dark={dark}
        account={account}
        view={page}
        onTheme={() => setDark(value => !value)}
        onAccount={openAccount}
        onHome={() => {
          if (page === "map") mapPage.current?.home();
          else navigate("");
        }}
        onMyReports={() => {
          if (account) navigate(reportsHash);
          else openAccount();
        }}
        onReport={() => {
          navigate("");
          mapPage.current?.report();
        }}
      />

      <div className="stage">
        <MapPage
          ref={mapPage}
          active={page === "map"}
          dark={dark}
          account={account}
          sessionRevision={sessionRevision}
          onLogin={openAccount}
        />

        {page === "reports" && (
          <main className="page" aria-label="Moje prijave">
            {account ? (
              <ReportsPage />
            ) : (
              <Page title="Moje prijave" subtitle="Ovaj je pregled dostupan prijavljenim korisnicima.">
                {session.data === undefined && !session.error ? (
                  <p className="inline-note" role="status">Provjera prijave…</p>
                ) : (
                  <div className="form-actions start">
                    <button type="button" className="primary" onClick={openAccount}>
                      Prijava
                    </button>

                    <button type="button" className="secondary" onClick={() => navigate("")}>
                      Natrag na kartu
                    </button>
                  </div>
                )}
              </Page>
            )}
          </main>
        )}
      </div>

      {accountOpen && (
        <AccountDialog
          session={signedOut ? "guest" : session.data ?? "guest"}
          onClose={() => setAccountOpen(false)}
          onChange={logout => {
            setSignedOut(!!logout);

            if (logout) {
              mapPage.current?.reset();
              navigate("");
            }

            session.refresh();
            setSessionRevision(value => value + 1);
          }}
        />
      )}
    </div>
  );
}

export default App;
