import { Link } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { NAVEGACION } from "../config/navigation";
import { useAuth } from "../store/AuthContext";
import styles from "./HomePage.module.css";

/** Migra Views/Home/Index.cshtml, ahora con accesos directos a los modulos. */
export function HomePage() {
  const { session, tenant, tieneModulo } = useAuth();

  const accesos = NAVEGACION.filter((e) => !e.modulo || tieneModulo(e.modulo)).flatMap((entrada) =>
    entrada.tipo === "enlace"
      ? [{ ...entrada, grupo: "Operación" }]
      : entrada.items
          .filter((item) => !item.modulo || tieneModulo(item.modulo))
          .map((item) => ({ ...item, grupo: entrada.label })),
  );

  return (
    <>
      <PageHeader
        eyebrow={tenant?.NameCompanyTenant}
        title="Bienvenido"
        description={session?.username}
      />

      {accesos.length === 0 ? (
        <p className={styles.vacio}>Tu usuario no tiene módulos asignados en esta compañía.</p>
      ) : (
        <ul className={styles.grid}>
          {accesos.map((acceso) => (
            <li key={acceso.to}>
              <Link to={acceso.to} className={styles.tarjeta}>
                <span className={styles.icono}>{acceso.icon}</span>
                <span>
                  <span className={styles.grupo}>{acceso.grupo}</span>
                  <span className={styles.label}>{acceso.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
