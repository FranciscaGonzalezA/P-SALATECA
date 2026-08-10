import { useCallback, useEffect, useState } from 'react';
import type { AuthenticatedUserDto } from '@salateca/contracts';
import { fetchCurrentUser, logout } from './api/authApi';
import { fetchCatalog } from './api/catalogApi';
import { SiteChrome, type AppRoute } from './components/SiteChrome';
import { MovieDetailModal } from './components/MovieDetailModal';
import { CatalogView } from './views/CatalogView';
import { HomeView } from './views/HomeView';
import { MovieDetailView } from './views/MovieDetailView';
import { PostDetailView } from './views/PostDetailView';
import { PostsView } from './views/PostsView';
import { AdminView } from './views/AdminView';
import { AdminPreviewView } from './views/AdminPreviewView';
import { LoginView } from './views/LoginView';

interface RouteState {
  page: AppRoute | 'movie' | 'post' | 'admin-demo';
  movieId?: number | undefined;
  postId?: number | undefined;
}

type MovieOrigin = Extract<AppRoute, 'home' | 'catalog'>;

function routePath(nextRoute: RouteState): string {
  return nextRoute.page === 'home'
    ? '/'
    : nextRoute.page === 'catalog'
      ? '/cartelera'
      : nextRoute.page === 'posts'
        ? '/posts'
        : nextRoute.page === 'admin'
          ? '/admin'
          : nextRoute.page === 'admin-demo'
            ? '/admin-demo'
            : nextRoute.page === 'post'
              ? `/posts/${nextRoute.postId}`
              : `/peliculas/${nextRoute.movieId}`;
}

function routeFromLocation(): RouteState {
  const postMatch = /^\/posts\/(\d+)$/.exec(window.location.pathname);
  if (postMatch?.[1]) {
    return { page: 'post', postId: Number(postMatch[1]) };
  }
  const movieMatch = /^\/peliculas\/(\d+)$/.exec(window.location.pathname);
  if (movieMatch?.[1]) {
    return { page: 'movie', movieId: Number(movieMatch[1]) };
  }
  if (window.location.pathname === '/cartelera') {
    return { page: 'catalog' };
  }
  if (window.location.pathname === '/admin') {
    return { page: 'admin' };
  }
  if (window.location.pathname === '/admin-demo') {
    return { page: 'admin-demo' };
  }
  return window.location.pathname === '/posts' ? { page: 'posts' } : { page: 'home' };
}

function App() {
  const [route, setRoute] = useState<RouteState>(routeFromLocation);
  const [movieOrigin, setMovieOrigin] = useState<MovieOrigin>(() => {
    const storedOrigin = window.history.state?.movieOrigin;
    return storedOrigin === 'home' ? 'home' : 'catalog';
  });
  const [featured, setFeatured] = useState<Awaited<ReturnType<typeof fetchCatalog>>['items']>([]);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUserDto | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const onPopState = () => {
      const nextRoute = routeFromLocation();
      const storedOrigin = window.history.state?.movieOrigin;
      if (nextRoute.page === 'movie' && (storedOrigin === 'home' || storedOrigin === 'catalog')) {
        setMovieOrigin(storedOrigin);
      }
      setRoute(nextRoute);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    fetchCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalog({ page: 1, pageSize: 3, sort: 'featured' }, controller.signal)
      .then((result) => setFeatured(result.items))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const navigate = (nextRoute: RouteState) => {
    window.history.pushState({}, '', routePath(nextRoute));
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openMovie = useCallback((movieId: number, origin: MovieOrigin) => {
    setMovieOrigin(origin);
    window.history.pushState(
      { salatecaMovieModal: true, movieOrigin: origin },
      '',
      `/peliculas/${movieId}`,
    );
    setRoute({ page: 'movie', movieId });
  }, []);

  const closeMovie = useCallback(() => {
    if (window.history.state?.salatecaMovieModal) {
      window.history.back();
      return;
    }

    const returnRoute: RouteState = { page: movieOrigin };
    window.history.replaceState({}, '', routePath(returnRoute));
    setRoute(returnRoute);
  }, [movieOrigin]);

  const isMovieModal = route.page === 'movie' && Boolean(window.history.state?.salatecaMovieModal);

  const chromeRoute: AppRoute =
    route.page === 'movie'
      ? isMovieModal
        ? movieOrigin
        : 'catalog'
      : route.page === 'post'
        ? 'posts'
        : route.page === 'admin-demo'
          ? 'admin'
          : route.page;

  const endSession = async () => {
    await logout().catch(() => undefined);
    setCurrentUser(null);
  };

  return (
    <SiteChrome
      currentRoute={chromeRoute}
      onNavigate={(page) => navigate({ page })}
      isAdmin={currentUser?.role === 'admin'}
    >
      {(route.page === 'home' || (isMovieModal && movieOrigin === 'home')) && (
        <HomeView
          featured={featured}
          onCatalog={() => navigate({ page: 'catalog' })}
          onMovie={(movieId) => openMovie(movieId, 'home')}
        />
      )}
      {(route.page === 'catalog' || (isMovieModal && movieOrigin === 'catalog')) && (
        <CatalogView onMovie={(movieId) => openMovie(movieId, 'catalog')} />
      )}
      {route.page === 'movie' && route.movieId && isMovieModal && (
        <MovieDetailModal onClose={closeMovie}>
          <MovieDetailView movieId={route.movieId} onBack={closeMovie} />
        </MovieDetailModal>
      )}
      {route.page === 'movie' && route.movieId && !isMovieModal && (
        <MovieDetailView movieId={route.movieId} onBack={() => navigate({ page: 'catalog' })} />
      )}
      {route.page === 'posts' && (
        <PostsView onPost={(postId) => navigate({ page: 'post', postId })} />
      )}
      {route.page === 'post' && route.postId && (
        <PostDetailView postId={route.postId} onBack={() => navigate({ page: 'posts' })} />
      )}
      {route.page === 'admin' && authLoading && (
        <section className="page-section admin-loading" aria-label="Comprobando sesión">
          Comprobando sesión…
        </section>
      )}
      {route.page === 'admin' && !authLoading && currentUser?.role !== 'admin' && (
        <LoginView
          onAuthenticated={setCurrentUser}
          onPreview={() => navigate({ page: 'admin-demo' })}
        />
      )}
      {route.page === 'admin' && currentUser?.role === 'admin' && (
        <AdminView user={currentUser} onLogout={endSession} />
      )}
      {route.page === 'admin-demo' && <AdminPreviewView />}
    </SiteChrome>
  );
}

export default App;
