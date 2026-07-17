import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import { campanasIniciales, catalogos, reglasIniciales } from "../data/mockData";
import type { Campana, Catalogos, Regla } from "../types/bonificados";

interface State {
  campanas: Campana[];
  reglas: Regla[];
}

type Action =
  | { type: "ADD_CAMPANA"; payload: Campana }
  | { type: "UPDATE_CAMPANA"; payload: Campana }
  | { type: "DELETE_CAMPANA"; payload: { id: string } }
  | { type: "ADD_REGLA"; payload: Regla }
  | { type: "UPDATE_REGLA"; payload: Regla }
  | { type: "DELETE_REGLA"; payload: { id: string } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_CAMPANA":
      return { ...state, campanas: [action.payload, ...state.campanas] };
    case "UPDATE_CAMPANA":
      return {
        ...state,
        campanas: state.campanas.map((c) => (c.id === action.payload.id ? action.payload : c)),
      };
    case "DELETE_CAMPANA":
      return {
        campanas: state.campanas.filter((c) => c.id !== action.payload.id),
        reglas: state.reglas.filter((r) => r.campanaId !== action.payload.id),
      };
    case "ADD_REGLA":
      return { ...state, reglas: [action.payload, ...state.reglas] };
    case "UPDATE_REGLA":
      return {
        ...state,
        reglas: state.reglas.map((r) => (r.id === action.payload.id ? action.payload : r)),
      };
    case "DELETE_REGLA":
      return { ...state, reglas: state.reglas.filter((r) => r.id !== action.payload.id) };
    default:
      return state;
  }
}

interface BonificadosContextValue {
  campanas: Campana[];
  reglas: Regla[];
  catalogos: Catalogos;
  getCampana: (id: string) => Campana | undefined;
  getRegla: (id: string) => Regla | undefined;
  getReglasDeCampana: (campanaId: string) => Regla[];
  addCampana: (data: Omit<Campana, "id" | "fechaCreacion" | "usuarioCreacion">) => Campana;
  updateCampana: (campana: Campana) => void;
  deleteCampana: (id: string) => void;
  addRegla: (data: Omit<Regla, "id" | "fechaCreacion" | "usuarioCreacion" | "stockConsumido">) => Regla;
  updateRegla: (regla: Regla) => void;
  deleteRegla: (id: string) => void;
}

const BonificadosContext = createContext<BonificadosContextValue | null>(null);

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function BonificadosProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    campanas: campanasIniciales,
    reglas: reglasIniciales,
  });

  const value = useMemo<BonificadosContextValue>(
    () => ({
      campanas: state.campanas,
      reglas: state.reglas,
      catalogos,
      getCampana: (id) => state.campanas.find((c) => c.id === id),
      getRegla: (id) => state.reglas.find((r) => r.id === id),
      getReglasDeCampana: (campanaId) => state.reglas.filter((r) => r.campanaId === campanaId),
      addCampana: (data) => {
        const campana: Campana = {
          ...data,
          id: newId("c"),
          fechaCreacion: new Date().toISOString().slice(0, 10),
          usuarioCreacion: "demo",
        };
        dispatch({ type: "ADD_CAMPANA", payload: campana });
        return campana;
      },
      updateCampana: (campana) => dispatch({ type: "UPDATE_CAMPANA", payload: campana }),
      deleteCampana: (id) => dispatch({ type: "DELETE_CAMPANA", payload: { id } }),
      addRegla: (data) => {
        const regla: Regla = {
          ...data,
          id: newId("r"),
          stockConsumido: 0,
          fechaCreacion: new Date().toISOString().slice(0, 10),
          usuarioCreacion: "demo",
        };
        dispatch({ type: "ADD_REGLA", payload: regla });
        return regla;
      },
      updateRegla: (regla) => dispatch({ type: "UPDATE_REGLA", payload: regla }),
      deleteRegla: (id) => dispatch({ type: "DELETE_REGLA", payload: { id } }),
    }),
    [state],
  );

  return <BonificadosContext.Provider value={value}>{children}</BonificadosContext.Provider>;
}

export function useBonificados() {
  const ctx = useContext(BonificadosContext);
  if (!ctx) throw new Error("useBonificados debe usarse dentro de BonificadosProvider");
  return ctx;
}
