import StationsMap from "./components/StationsMap";
import { mockStations } from "./services/mockStations";

function App() {
  return (
    <main>
      <h1>StormWatch</h1>
      <StationsMap stations={mockStations} />
    </main>
  );
}

export default App;
