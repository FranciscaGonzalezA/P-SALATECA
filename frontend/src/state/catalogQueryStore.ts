import type { CatalogQuery } from '../api/catalogApi';

export const defaultCatalogQuery: CatalogQuery = {
  page: 1,
  pageSize: 30,
};

const queryChangedEvent = 'salateca:catalog-query-change';
const managedParameters = ['buscar', 'fecha', 'horario', 'sala', 'genero', 'orden', 'pagina'];

const sortFromUrl = {
  destacados: 'featured',
  alfabetico_asc: 'alphabetical-asc',
  alfabetico_desc: 'alphabetical-desc',
} as const;

const sortToUrl = {
  featured: 'destacados',
  'alphabetical-asc': 'alfabetico_asc',
  'alphabetical-desc': 'alfabetico_desc',
} as const;

let cachedLocation = '';
let cachedQuery: CatalogQuery = defaultCatalogQuery;

function optionalValue(parameters: URLSearchParams, name: string): string | undefined {
  const value = parameters.get(name)?.trim();
  return value || undefined;
}

export function parseCatalogQuery(parameters: URLSearchParams): CatalogQuery {
  const pageValue = Number(parameters.get('pagina'));
  const sortValue = optionalValue(parameters, 'orden');

  return {
    page: Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1,
    pageSize: defaultCatalogQuery.pageSize,
    search: optionalValue(parameters, 'buscar'),
    date: optionalValue(parameters, 'fecha'),
    time: optionalValue(parameters, 'horario'),
    venue: optionalValue(parameters, 'sala'),
    genre: optionalValue(parameters, 'genero'),
    sort:
      sortValue && Object.hasOwn(sortFromUrl, sortValue)
        ? sortFromUrl[sortValue as keyof typeof sortFromUrl]
        : undefined,
  };
}

export function writeCatalogQuery(
  parameters: URLSearchParams,
  query: CatalogQuery,
): URLSearchParams {
  const nextParameters = new URLSearchParams(parameters);
  managedParameters.forEach((name) => nextParameters.delete(name));

  const values: Array<[string, string | number | undefined]> = [
    ['buscar', query.search],
    ['fecha', query.date],
    ['horario', query.time],
    ['sala', query.venue],
    ['genero', query.genre],
    ['orden', query.sort && query.sort !== 'upcoming' ? sortToUrl[query.sort] : undefined],
    ['pagina', query.page > 1 ? query.page : undefined],
  ];

  for (const [name, value] of values) {
    if (value !== undefined && value !== '') nextParameters.set(name, String(value));
  }

  return nextParameters;
}

export function getCatalogQuerySnapshot(): CatalogQuery {
  if (window.location.pathname !== '/cartelera') return cachedQuery;

  const locationKey = `${window.location.pathname}${window.location.search}`;
  if (locationKey !== cachedLocation) {
    cachedLocation = locationKey;
    cachedQuery = parseCatalogQuery(new URLSearchParams(window.location.search));
  }

  return cachedQuery;
}

export function subscribeToCatalogQuery(onStoreChange: () => void): () => void {
  window.addEventListener('popstate', onStoreChange);
  window.addEventListener(queryChangedEvent, onStoreChange);

  return () => {
    window.removeEventListener('popstate', onStoreChange);
    window.removeEventListener(queryChangedEvent, onStoreChange);
  };
}

export function updateCatalogQuery(changes: Partial<CatalogQuery>): void {
  const current = getCatalogQuerySnapshot();
  const nextQuery = {
    ...current,
    ...changes,
    page: changes.page ?? 1,
    pageSize: defaultCatalogQuery.pageSize,
  };
  const parameters = writeCatalogQuery(new URLSearchParams(window.location.search), nextQuery);
  const search = parameters.toString();
  const nextLocation = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;

  window.history.replaceState(window.history.state, '', nextLocation);
  cachedLocation = '';
  window.dispatchEvent(new Event(queryChangedEvent));
}

export function resetCatalogQuery(): void {
  const parameters = writeCatalogQuery(
    new URLSearchParams(window.location.search),
    defaultCatalogQuery,
  );
  const search = parameters.toString();
  const nextLocation = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;

  window.history.replaceState(window.history.state, '', nextLocation);
  cachedLocation = '';
  window.dispatchEvent(new Event(queryChangedEvent));
}
