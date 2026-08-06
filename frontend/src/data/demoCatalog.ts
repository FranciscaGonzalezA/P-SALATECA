import type {
  GenreDto,
  MovieDetailDto,
  MovieSummaryDto,
  ScreeningDto,
  SourceDto,
  VenueDto,
} from '@salateca/contracts';

export const demoGenres: GenreDto[] = [
  { id: 1, name: 'Drama', slug: 'drama' },
  { id: 2, name: 'Documental', slug: 'documental' },
  { id: 3, name: 'Animación', slug: 'animacion' },
  { id: 4, name: 'Cine chileno', slug: 'cine-chileno' },
];

export const demoVenues: VenueDto[] = [
  {
    id: 1,
    name: 'Cineteca Nacional de Chile',
    slug: 'cineteca-nacional-de-chile',
    address: 'Plaza de la Ciudadanía 26',
    municipality: 'Santiago',
    websiteUrl: 'https://www.cclm.cl/cineteca-nacional-de-chile/',
  },
  {
    id: 2,
    name: 'Cine Arte Normandie',
    slug: 'cine-arte-normandie',
    address: 'Tarapacá 1181',
    municipality: 'Santiago',
    websiteUrl: 'https://normandie.cl/',
  },
  {
    id: 3,
    name: 'Sala K',
    slug: 'sala-k',
    address: 'Marín 321',
    municipality: 'Providencia',
    websiteUrl: null,
  },
];

const demoSource: SourceDto = {
  id: 1,
  name: 'Cartelera de demostración',
  type: 'manual',
  url: 'https://example.com/salateca-demo',
  lastSuccessfulSyncAt: '2026-07-27T12:00:00.000Z',
};

function screening(
  id: number,
  date: string,
  time: string,
  venue: VenueDto,
  language: string | null = 'Español',
): ScreeningDto {
  const offset = date < '2026-09-06' ? '-04:00' : '-03:00';

  return {
    id,
    date,
    time,
    startsAt: new Date(`${date}T${time}:00${offset}`).toISOString(),
    language,
    format: '2D',
    officialUrl: venue.websiteUrl ?? demoSource.url,
    capturedAt: '2026-07-27T12:00:00.000Z',
    venue,
    source: demoSource,
  };
}

export const demoMovies: MovieDetailDto[] = [
  {
    id: 1,
    title: 'La casa lobo',
    originalTitle: null,
    releaseYear: 2018,
    durationMinutes: 75,
    director: 'Cristóbal León y Joaquín Cociña',
    synopsis:
      'Una joven escapa de una colonia alemana y se refugia en una casa donde la realidad comienza a transformarse.',
    posterUrl: null,
    genres: [demoGenres[2]!, demoGenres[3]!],
    screenings: [
      screening(1, '2026-08-01', '18:00', demoVenues[0]!),
      screening(2, '2026-08-03', '20:30', demoVenues[2]!),
    ],
    updatedAt: '2026-07-27T12:00:00.000Z',
  },
  {
    id: 2,
    title: 'El agente topo',
    originalTitle: null,
    releaseYear: 2020,
    durationMinutes: 84,
    director: 'Maite Alberdi',
    synopsis:
      'Un investigador privado contrata a un hombre mayor para observar desde dentro la vida cotidiana de una residencia.',
    posterUrl: null,
    genres: [demoGenres[1]!, demoGenres[3]!],
    screenings: [
      screening(3, '2026-08-01', '19:30', demoVenues[1]!),
      screening(4, '2026-08-04', '17:15', demoVenues[0]!),
    ],
    updatedAt: '2026-07-27T12:00:00.000Z',
  },
  {
    id: 3,
    title: 'Nostalgia de la luz',
    originalTitle: null,
    releaseYear: 2010,
    durationMinutes: 90,
    director: 'Patricio Guzmán',
    synopsis:
      'En el desierto de Atacama, astrónomos y familiares de detenidos desaparecidos buscan respuestas mirando hacia el pasado.',
    posterUrl: null,
    genres: [demoGenres[1]!, demoGenres[3]!],
    screenings: [screening(5, '2026-08-02', '17:00', demoVenues[2]!)],
    updatedAt: '2026-07-27T12:00:00.000Z',
  },
  {
    id: 4,
    title: 'Una mujer fantástica',
    originalTitle: null,
    releaseYear: 2017,
    durationMinutes: 104,
    director: 'Sebastián Lelio',
    synopsis:
      'Marina enfrenta el duelo y los prejuicios después de la muerte repentina de su pareja.',
    posterUrl: null,
    genres: [demoGenres[0]!, demoGenres[3]!],
    screenings: [screening(6, '2026-08-03', '18:30', demoVenues[1]!)],
    updatedAt: '2026-07-27T12:00:00.000Z',
  },
  {
    id: 5,
    title: 'Los colonos',
    originalTitle: null,
    releaseYear: 2023,
    durationMinutes: 97,
    director: 'Felipe Gálvez',
    synopsis:
      'Tres jinetes atraviesan Tierra del Fuego para delimitar las tierras de un poderoso terrateniente.',
    posterUrl: null,
    genres: [demoGenres[0]!, demoGenres[3]!],
    screenings: [screening(7, '2026-08-04', '21:00', demoVenues[0]!)],
    updatedAt: '2026-07-27T12:00:00.000Z',
  },
  {
    id: 6,
    title: 'El botón de nácar',
    originalTitle: null,
    releaseYear: 2015,
    durationMinutes: 82,
    director: 'Patricio Guzmán',
    synopsis:
      'El océano y la memoria de Chile se conectan a través de relatos indígenas y episodios de su historia reciente.',
    posterUrl: null,
    genres: [demoGenres[1]!, demoGenres[3]!],
    screenings: [screening(8, '2026-08-03', '20:15', demoVenues[2]!)],
    updatedAt: '2026-07-27T12:00:00.000Z',
  },
];

export interface DemoCatalogFilters {
  date?: string | undefined;
  time?: string | undefined;
  venue?: string | undefined;
  genre?: string | undefined;
  search?: string | undefined;
  page: number;
  pageSize: number;
}

export function filterDemoMovies(filters: DemoCatalogFilters): {
  items: MovieSummaryDto[];
  total: number;
} {
  const search = filters.search?.toLocaleLowerCase('es-CL');
  const items = demoMovies
    .map((movie) => ({
      ...movie,
      screenings: movie.screenings.filter(
        (item) =>
          (!filters.date || item.date === filters.date) &&
          (!filters.time || item.time === filters.time) &&
          (!filters.venue || item.venue.slug === filters.venue),
      ),
    }))
    .filter(
      (movie) =>
        movie.screenings.length > 0 &&
        (!filters.genre || movie.genres.some((genre) => genre.slug === filters.genre)) &&
        (!search ||
          movie.title.toLocaleLowerCase('es-CL').includes(search) ||
          movie.director?.toLocaleLowerCase('es-CL').includes(search)),
    );
  const offset = (filters.page - 1) * filters.pageSize;

  return {
    items: items.slice(offset, offset + filters.pageSize),
    total: items.length,
  };
}
