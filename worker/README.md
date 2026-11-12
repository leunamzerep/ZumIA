# Worker de verificación (Cloudflare + D1)

Paso 1: solo estructura local y `GET /health`. Sin correos ni verificación todavía.
Los descuentos se leen de `../src/data/plans.ts` (por eso ese archivo no debe importar nada del front).

Desde esta carpeta (`worker/`):

```powershell
npm install                  # una vez
npm run db:migrate:local     # crea las tablas en la D1 local
Copy-Item seed.example.sql seed.local.sql   # luego edita los correos reales
npm run db:seed:local        # carga los proyectos
npm run dev                  # http://localhost:8787/health
```

`seed.local.sql` y `.dev.vars` están en `.gitignore`: nunca subas correos reales ni secretos.
