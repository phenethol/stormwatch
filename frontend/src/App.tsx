import { useState } from "react";
import StationsMap from "./components/StationsMap";
import { mockStations } from "./services/mockStations";
import ReportsPage from "./pages/ReportsPage";

function App() {
  const [page, setPage] = useState("map");

  return (
    <main>
      <h1>StormWatch</h1>

      <nav>
        <button onClick={() => setPage("map")}>
          Karta
        </button>

        <button onClick={() => setPage("reports")}>
          Moje prijave
        </button>
      </nav>

      {page === "map" ? (
        <StationsMap stations={mockStations} />
      ) : (
        <ReportsPage />
      )}
    </main>
  );
}

export default App;