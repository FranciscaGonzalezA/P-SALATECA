import { useEffect, useState } from 'react';
import type { AuthenticatedUserDto } from '@salateca/contracts';
import { fetchCurrentUser, logout } from './api/authApi';
import { fetchCatalog } from './api/catalogApi';
import { SiteChrome, type AppRoute } from './components/SiteChrome';
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
  const [featured, setFeatured] = useState<Awaited<ReturnType<typeof fetchCatalog>>['items']>([]);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUserDto | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
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
    fetchCatalog({ page: 1, pageSize: 3 }, controller.signal)
      .then((result) => setFeatured(result.items))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const navigate = (nextRoute: RouteState) => {
    const path =
      nextRoute.page === 'home'
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
    window.history.pushState({}, '', path);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const chromeRoute: AppRoute =
    route.page === 'movie'
      ? 'catalog'
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
      {route.page === 'home' && (
        <HomeView
          featured={featured}
          onCatalog={() => navigate({ page: 'catalog' })}
          onMovie={(movieId) => navigate({ page: 'movie', movieId })}
        />
      )}
      {route.page === 'catalog' && (
        <CatalogView onMovie={(movieId) => navigate({ page: 'movie', movieId })} />
      )}
      {route.page === 'movie' && route.movieId && (
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
