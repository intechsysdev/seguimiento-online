import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { BonificadosProvider } from "./store/BonificadosContext";
import { CampanasPage } from "./pages/CampanasPage";
import { CampanaFormPage } from "./pages/CampanaFormPage";
import { ReglasPage } from "./pages/ReglasPage";
import { ReglaFormPage } from "./pages/ReglaFormPage";

function App() {
  return (
    <BonificadosProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<CampanasPage />} />
          <Route path="/campanas/nueva" element={<CampanaFormPage />} />
          <Route path="/campanas/:id/editar" element={<CampanaFormPage />} />
          <Route path="/campanas/:campanaId" element={<ReglasPage />} />
          <Route path="/campanas/:campanaId/reglas/nueva" element={<ReglaFormPage />} />
          <Route path="/campanas/:campanaId/reglas/:reglaId" element={<ReglaFormPage />} />
        </Routes>
      </AppShell>
    </BonificadosProvider>
  );
}

export default App;
