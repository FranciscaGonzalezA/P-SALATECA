# Diagramas de soporte actualizados

Los diagramas representan el sistema implementado al commit `fbbb39b`. Sustituyen para este
hito las figuras conceptuales del informe inicial, que no incluyen autenticación, publicaciones,
staging completo ni enriquecimiento de metadatos.

## 1. Casos de uso del MVP

```mermaid
flowchart LR
  visitor["Actor: visitante"]
  admin["Actor: administrador"]
  scheduler["Actor: planificador / scraper"]
  source["Actor: fuente externa"]
  tmdb["Actor: TMDB"]

  subgraph Salateca
    uc1((Consultar cartelera))
    uc2((Buscar y filtrar))
    uc3((Ver detalle de película))
    uc4((Abrir fuente oficial))
    uc5((Leer publicaciones))
    uc6((Iniciar y cerrar sesión))
    uc7((Recuperar contraseña))
    uc8((Importar funciones desde Excel))
    uc9((Validar región de salas))
    uc10((Administrar publicaciones))
    uc11((Recolectar cartelera))
    uc12((Normalizar y publicar registros))
    uc13((Enriquecer metadatos))
    uc14((Registrar trazabilidad y errores))
  end

  visitor --> uc1
  visitor --> uc2
  visitor --> uc3
  visitor --> uc4
  visitor --> uc5

  admin --> uc6
  admin --> uc7
  admin --> uc8
  admin --> uc9
  admin --> uc10

  scheduler --> uc11
  scheduler --> uc12
  source --> uc11
  tmdb --> uc13

  uc2 -. incluye .-> uc1
  uc3 -. extiende .-> uc1
  uc8 -. incluye .-> uc12
  uc11 -. incluye .-> uc12
  uc12 -. incluye .-> uc14
  uc12 -. extiende .-> uc13
```

### Observación de alcance

El caso de uso “Administrar cartelera” del informe inicial se encuentra cubierto parcialmente:
la iteración permite importar funciones y validar salas, pero no ofrece CRUD completo de
películas, salas y funciones.

## 2. Diagrama de componentes

```mermaid
flowchart TB
  subgraph External[Servicios y fuentes externas]
    Web[Webs y calendarios de salas]
    IG[Instagram Graph API opcional]
    TMDB[TMDB API]
    XLSX[Archivo XLSX administrativo]
  end

  subgraph Scraper[Paquete scraper]
    Connectors[Conectores por fuente]
    Http[Cliente HTTP]
    Normalize[Normalización]
    Runner[Coordinador y scheduler]
    Publisher[Publicador hacia backend]
  end

  subgraph Backend[Backend Express]
    Api[API /api/v1]
    Auth[Autenticación y roles]
    Catalog[Catálogo]
    Ingestion[Ingesta]
    Metadata[Metadatos]
    Posts[Publicaciones]
    Venues[Validación de salas]
    Repositories[Repositorios MySQL]
  end

  subgraph Data[MySQL 8.4]
    Staging[(Staging y errores)]
    CatalogDb[(Películas, salas y funciones)]
    Identity[(Usuarios y sesiones)]
    Editorial[(Publicaciones)]
    Assets[(Activos y derechos)]
  end

  subgraph Frontend[Frontend React]
    PublicViews[Vistas públicas]
    AdminViews[Panel administrativo]
    Clients[Clientes HTTP]
  end

  Contracts[Paquete de contratos TypeScript]

  Web --> Connectors
  IG --> Connectors
  Http --> Connectors
  Connectors --> Normalize
  Normalize --> Runner
  Runner --> Publisher
  Publisher -->|POST /internal/scraper/ingest| Ingestion
  XLSX -->|POST /admin/screenings/import| Ingestion
  Ingestion --> Metadata
  Metadata --> TMDB

  Api --> Auth
  Api --> Catalog
  Api --> Ingestion
  Api --> Posts
  Api --> Venues
  Auth --> Repositories
  Catalog --> Repositories
  Ingestion --> Repositories
  Metadata --> Repositories
  Posts --> Repositories
  Venues --> Repositories

  Repositories --> Staging
  Repositories --> CatalogDb
  Repositories --> Identity
  Repositories --> Editorial
  Repositories --> Assets

  PublicViews --> Clients
  AdminViews --> Clients
  Clients --> Api
  Contracts -. DTO compartidos .-> Clients
  Contracts -. DTO compartidos .-> Api
```

## 3. Secuencia de ingesta automatizada

```mermaid
sequenceDiagram
  autonumber
  actor Scheduler as Planificador
  participant Runner as CollectionRunner
  participant Connector as Conector de fuente
  participant Source as Fuente externa
  participant Normalizer as Normalizador
  participant API as Backend interno
  participant Ingestion as Servicio de ingesta
  participant DB as MySQL
  participant TMDB as TMDB

  Scheduler->>Runner: iniciar ciclo
  loop por fuente configurada
    Runner->>Connector: collect()
    Connector->>Source: solicitar contenido
    Source-->>Connector: HTML/JSON/calendario
    Connector-->>Runner: registros crudos
    Runner->>Normalizer: normalizar lote
    Normalizer-->>Runner: válidos y errores de formato
    Runner->>API: POST /internal/scraper/ingest
    API->>Ingestion: validar credencial y esquema
    Ingestion->>DB: crear ingestion_run
    loop por registro
      Ingestion->>DB: guardar staging_record
      alt registro válido y no duplicado
        Ingestion->>DB: publicar película, sala y función
      else inválido o duplicado
        Ingestion->>DB: guardar estado y error
      end
    end
    Ingestion->>TMDB: buscar títulos únicos publicables
    TMDB-->>Ingestion: ficha, géneros y afiche
    Ingestion->>DB: completar campos vacíos y activos enlazados
    Ingestion->>DB: cerrar corrida con contadores
    API-->>Runner: resumen de aceptación y rechazo
  end
```

## 4. Secuencia de consulta pública

```mermaid
sequenceDiagram
  autonumber
  actor User as Visitante
  participant UI as Frontend React
  participant API as API de catálogo
  participant Schema as Validación Zod
  participant Repo as Repositorio MySQL
  participant DB as MySQL

  User->>UI: define búsqueda y filtros
  UI->>API: GET /api/v1/cartelera?...
  API->>Schema: validar fecha, hora, texto y paginación
  alt parámetros inválidos
    Schema-->>API: error de validación
    API-->>UI: 400 con mensaje controlado
    UI-->>User: muestra error recuperable
  else parámetros válidos
    Schema-->>API: filtros tipados
    API->>Repo: listCatalog(filtros)
    Repo->>DB: consulta parametrizada e indexada
    DB-->>Repo: películas, géneros, funciones y fuentes
    Repo-->>API: DTO paginado
    API-->>UI: 200 JSON
    UI-->>User: cartelera, conteo y paginación
  end
```

## 5. Modelo entidad-relación implementado

El diagrama resume las claves y relaciones centrales. Los campos completos y las restricciones
se conservan en `database/migrations` y `docs/data-dictionary.md`.

```mermaid
erDiagram
  SOURCES {
    bigint id PK
    varchar name
    enum source_type
    varchar base_url UK
    boolean is_active
    datetime last_successful_sync_at
  }

  INGESTION_RUNS {
    bigint id PK
    bigint source_id FK
    enum status
    int records_found
    int records_accepted
    int records_rejected
    int records_duplicates
  }

  STAGING_RECORDS {
    bigint id PK
    bigint ingestion_run_id FK
    varchar source_url
    json raw_payload
    json normalized_payload
    enum processing_status
    datetime captured_at
  }

  INGESTION_ERRORS {
    bigint id PK
    bigint ingestion_run_id FK
    bigint staging_record_id FK
    varchar field_name
    varchar error_code
    text error_message
  }

  MOVIES {
    bigint id PK
    varchar title
    varchar canonical_title
    enum content_type
    smallint release_year
    int tmdb_id UK
    decimal tmdb_vote_average
  }

  GENRES {
    smallint id PK
    varchar name UK
    varchar slug UK
  }

  MOVIE_GENRES {
    bigint movie_id PK,FK
    smallint genre_id PK,FK
  }

  VENUES {
    bigint id PK
    varchar name
    varchar canonical_name UK
    varchar municipality
    varchar region_code
    varchar website_url
  }

  SCREENINGS {
    bigint id PK
    bigint movie_id FK
    bigint venue_id FK
    bigint source_id FK
    bigint staging_record_id FK
    datetime starts_at
    date screening_date
    time screening_time
    enum status
    varchar official_url
  }

  CONTENT_ASSETS {
    bigint id PK
    bigint movie_id FK
    bigint venue_id FK
    bigint source_id FK
    enum asset_type
    varchar original_url
    enum rights_status
  }

  POSTS {
    bigint id PK
    bigint source_id FK
    varchar title
    varchar source_url UK
    json keywords
    bigint display_order
  }

  USERS {
    bigint id PK
    varchar email UK
    varchar password_hash
    enum role
    boolean is_active
  }

  USER_SESSIONS {
    char token_hash PK
    bigint user_id FK
    datetime expires_at
    datetime last_used_at
  }

  PASSWORD_RESET_TOKENS {
    char token_hash PK
    bigint user_id FK,UK
    datetime expires_at
    datetime used_at
  }

  SOURCES ||--o{ INGESTION_RUNS : origina
  INGESTION_RUNS ||--o{ STAGING_RECORDS : contiene
  INGESTION_RUNS ||--o{ INGESTION_ERRORS : registra
  STAGING_RECORDS o|--o{ INGESTION_ERRORS : detalla
  STAGING_RECORDS o|--o{ SCREENINGS : publica

  MOVIES ||--o{ SCREENINGS : se_exhibe_en
  VENUES ||--o{ SCREENINGS : programa
  SOURCES ||--o{ SCREENINGS : informa

  MOVIES ||--o{ MOVIE_GENRES : clasifica
  GENRES ||--o{ MOVIE_GENRES : agrupa

  MOVIES o|--o{ CONTENT_ASSETS : posee
  VENUES o|--o{ CONTENT_ASSETS : posee
  SOURCES ||--o{ CONTENT_ASSETS : acredita
  SOURCES ||--o{ POSTS : publica

  USERS ||--o{ USER_SESSIONS : inicia
  USERS ||--o| PASSWORD_RESET_TOKENS : solicita
```

## 6. Relación entre artefactos

```mermaid
flowchart LR
  RF[RF y RNF] --> Stories[Tarjetas KAN]
  Stories --> Code[Código y migraciones]
  Code --> Tests[Pruebas y cobertura]
  Tests --> Evidence[Evidencia del Hito 2]
  Evidence --> Demo[Demostración]
  Tests --> Defects[Incidencias]
  Defects --> Stories
```
