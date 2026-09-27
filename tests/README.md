# Pruebas

La estrategia, los umbrales y los procedimientos están en
[docs/qa-strategy.md](../docs/qa-strategy.md). El último resultado verificable está en
[docs/qa-report-2026-07-28.md](../docs/qa-report-2026-07-28.md).

## Ejecución rápida

```powershell
pnpm test
pnpm test:coverage
pnpm quality
```

Las pruebas unitarias y de componentes usan fixtures y dobles locales. No dependen de sitios de
terceros ni de una instancia MySQL.

La prueba de carga requiere una API de QA en ejecución:

```powershell
$env:QA_BASE_URL = 'http://127.0.0.1:3000/api/v1'
pnpm qa:load
```

No debe apuntarse a producción. El script rechaza destinos remotos salvo que el operador habilite
explícitamente `QA_ALLOW_REMOTE=true`.
