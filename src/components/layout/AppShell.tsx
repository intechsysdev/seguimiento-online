import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  IconChevronRight,
  IconLock,
  IconLogout,
  IconMenu,
  IconMoon,
  IconSun,
  IconX,
} from "../icons";
import { LogoMarca } from "../Logo";
import { Avatar } from "../ui/Avatar";
import { NAVEGACION, type NavEntrada } from "../../config/navigation";
import { APP_COPYRIGHT, APP_NOMBRE, APP_VERSION } from "../../config/app";
import { useAuth } from "../../store/AuthContext";
import { useTheme } from "./useTheme";
import styles from "./AppShell.module.css";

/** Migra Views/Shared/_Layout.cshtml: sidebar por modulos + barra superior. */
export function AppShell() {
  const { theme, toggle } = useTheme();
  const { session, tenant, tieneModulo, logout, cambiarTenant } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();

  // En movil el sidebar se cierra al navegar, como hacia el collapse de Bootstrap.
  useEffect(() => setMenuAbierto(false), [location.pathname]);

  /** Entradas visibles segun los modulos del usuario. */
  const entradas = useMemo<NavEntrada[]>(
    () =>
      NAVEGACION.map((entrada) =>
        entrada.tipo === "grupo"
          ? {
              ...entrada,
              items: entrada.items.filter((item) => !item.modulo || tieneModulo(item.modulo)),
            }
          : entrada,
      ).filter((entrada) => {
        if (entrada.modulo && !tieneModulo(entrada.modulo)) return false;
        return entrada.tipo === "enlace" || entrada.items.length > 0;
      }),
    [tieneModulo],
  );

  /** Grupo que contiene la ruta actual; el MVC lo marcaba con ViewBag.ShowCollapse*. */
  const grupoActivo = useMemo(
    () =>
      entradas.find(
        (entrada) =>
          entrada.tipo === "grupo" &&
          entrada.items.some((item) => location.pathname.startsWith(item.to)),
      )?.label ?? null,
    [entradas, location.pathname],
  );

  // Solo se despliega el grupo de la pagina actual; el resto arranca plegado.
  const [abiertos, setAbiertos] = useState<string[]>(() => (grupoActivo ? [grupoActivo] : []));

  useEffect(() => {
    if (grupoActivo) setAbiertos((previos) => (previos.includes(grupoActivo) ? previos : [...previos, grupoActivo]));
  }, [grupoActivo]);

  function alternarGrupo(label: string) {
    setAbiertos((previos) =>
      previos.includes(label) ? previos.filter((l) => l !== label) : [...previos, label],
    );
  }

  return (
    <div className={styles.shell}>
      <aside className={[styles.sidebar, menuAbierto ? styles.sidebarAbierto : ""].join(" ")}>
        <div className={styles.sidebarHead}>
          <Link to="/" className={styles.brand}>
            <LogoMarca size={34} />
            <span className={styles.brandText}>{APP_NOMBRE}</span>
          </Link>
          <button
            type="button"
            className={styles.cerrarMenu}
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <IconX />
          </button>
        </div>

        {/* Tarjeta de usuario: equivale al user-card del _Layout del MVC. */}
        {session ? (
          <Link to="/perfil" className={styles.usuarioCard}>
            <Avatar email={session.username} nombre={session.username} size={38} />
            <span className={styles.usuarioDatos}>
              <span className={styles.usuarioNombre}>{session.username}</span>
              <span className={styles.usuarioRol}>{session.role || "Usuario"}</span>
            </span>
          </Link>
        ) : null}

        <nav className={styles.nav}>
          {entradas.map((entrada) => {
            if (entrada.tipo === "enlace") {
              return (
                <NavLink
                  key={entrada.to}
                  to={entrada.to}
                  className={({ isActive }) =>
                    [styles.navLink, styles.navLinkSuelto, isActive ? styles.navLinkActivo : ""].join(
                      " ",
                    )
                  }
                >
                  <span className={styles.navIcono}>{entrada.icon}</span>
                  {entrada.label}
                </NavLink>
              );
            }

            const abierto = abiertos.includes(entrada.label);
            const idPanel = `grupo-${entrada.label.replace(/\s+/g, "-")}`;

            return (
              <div key={entrada.label} className={styles.grupo}>
                <button
                  type="button"
                  className={[styles.grupoTitulo, abierto ? styles.grupoAbierto : ""].join(" ")}
                  onClick={() => alternarGrupo(entrada.label)}
                  aria-expanded={abierto}
                  aria-controls={idPanel}
                >
                  <span className={styles.grupoIcono}>{entrada.icon}</span>
                  <span className={styles.grupoLabel}>{entrada.label}</span>
                  <span className={styles.grupoFlecha} aria-hidden="true">
                    <IconChevronRight />
                  </span>
                </button>

                {abierto ? (
                  <ul id={idPanel}>
                    {entrada.items.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            [styles.navLink, isActive ? styles.navLinkActivo : ""].join(" ")
                          }
                        >
                          <span className={styles.navIcono}>{item.icon}</span>
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
          {entradas.length === 0 ? (
            <p className={styles.sinModulos}>Tu usuario no tiene módulos asignados.</p>
          ) : null}
        </nav>

        <footer className={styles.pieLateral}>
          <span>{APP_COPYRIGHT}</span>
          <span>Versión: {APP_VERSION}</span>
        </footer>
      </aside>

      {menuAbierto ? (
        <button
          type="button"
          className={styles.backdrop}
          onClick={() => setMenuAbierto(false)}
          aria-label="Cerrar menú"
        />
      ) : null}

      <div className={styles.contenido}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.abrirMenu}
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <IconMenu />
          </button>

          {/* Reemplaza a Seguridad/TenantsAssignments: el cambio de compania era
              una vista aparte; aca es un selector siempre visible. */}
          {session && session.tenants.length > 0 ? (
            <label className={styles.tenant}>
              <span className={styles.tenantLabel}>Compañía</span>
              <select
                className={styles.tenantSelect}
                value={session.tenantActual}
                onChange={(evento) => cambiarTenant(evento.target.value)}
              >
                {session.tenants.map((t) => (
                  <option key={t.IDTenant} value={t.IDCompanyTenant}>
                    {t.NameCompanyTenant}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className={styles.acciones}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggle}
              aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            >
              {theme === "dark" ? <IconSun /> : <IconMoon />}
            </button>

            {/* En movil el sidebar esta oculto, asi que aqui queda la foto. */}
            <span className={styles.usuarioMovil} title={session?.username}>
              <Avatar email={session?.username} nombre={session?.username} size={30} />
            </span>

            <Link to="/perfil" className={styles.iconBtn} aria-label="Mi perfil">
              <IconLock />
            </Link>

            <button
              type="button"
              className={styles.iconBtn}
              onClick={logout}
              aria-label="Cerrar sesión"
            >
              <IconLogout />
            </button>
          </div>
        </header>

        <main className={styles.main}>
          {tenant ? null : (
            <p className={styles.avisoTenant}>No hay una compañía activa seleccionada.</p>
          )}
          {/*
            La `key` remonta la pagina al cambiar de compañía. Sin esto los
            filtros conservaban la seleccion de la compañía anterior (vendedores,
            ciudades, rutas...), que no existe en la nueva, y la consulta salia
            con datos que no correspondian. El MVC lograba lo mismo cerrando la
            sesion en Seguridad/AssignmentCompany.
          */}
          <Outlet key={session?.tenantActual ?? "sin-compania"} />
        </main>
      </div>
    </div>
  );
}
