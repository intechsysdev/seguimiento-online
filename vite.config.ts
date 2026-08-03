import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Proxy dinamico para los API por compania.
 *
 * A diferencia del API de Seguridad (URL fija), cada tenant tiene su propia
 * APIUrlTenant y no se puede declarar como proxy estatico. El SPA llama
 * /api-tenant/<base64url del destino>/<ruta> y este middleware reenvia.
 *
 * Solo aplica en desarrollo: en produccion el SPA llama la URL del tenant
 * directamente y esos API deben exponer CORS.
 */
function tenantProxy(): Plugin {
  const PREFIJO = '/api-tenant/'

  return {
    name: 'tenant-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(PREFIJO)) return next()

        const resto = req.url.slice(PREFIJO.length)
        const corte = resto.indexOf('/')
        if (corte === -1) {
          res.statusCode = 400
          res.end('Falta la ruta destino')
          return
        }

        let base: string
        try {
          base = Buffer.from(resto.slice(0, corte), 'base64url').toString('utf8')
          new URL(base)
        } catch {
          res.statusCode = 400
          res.end('Destino invalido')
          return
        }

        const destino = base.replace(/\/$/, '') + resto.slice(corte)

        const cuerpos: Buffer[] = []
        req.on('data', (parte: Buffer) => cuerpos.push(parte))
        req.on('end', async () => {
          const headers: Record<string, string> = {}
          for (const [clave, valor] of Object.entries(req.headers)) {
            // host/connection los define fetch; el resto se reenvia tal cual.
            if (['host', 'connection', 'content-length'].includes(clave)) continue
            if (typeof valor === 'string') headers[clave] = valor
          }

          try {
            const respuesta = await fetch(destino, {
              method: req.method,
              headers,
              body: cuerpos.length ? Buffer.concat(cuerpos) : undefined,
            })
            res.statusCode = respuesta.status
            const tipo = respuesta.headers.get('content-type')
            if (tipo) res.setHeader('content-type', tipo)
            res.end(Buffer.from(await respuesta.arrayBuffer()))
          } catch (error) {
            res.statusCode = 502
            res.end(`Error al contactar ${base}: ${String(error)}`)
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const seguridadTarget = env.SEGURIDAD_PROXY_TARGET ?? 'https://eva.recamier.com:8471'

  return {
    plugins: [react(), tenantProxy()],
    server: {
      proxy: {
        // El API de Seguridad aun no expone CORS: en desarrollo el SPA llama
        // /api-seguridad/... y Vite reenvia la peticion desde el servidor.
        '/api-seguridad': {
          target: seguridadTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-seguridad/, ''),
        },
      },
    },
  }
})
