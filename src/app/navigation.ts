export type AppPage = 'home' | 'normal' | 'create' | 'ai' | 'search' | 'viewer' | 'manage' | 'about' | 'privacy';

export interface AppLocation {
  page: AppPage;
  profileId?: string;
}

const pageNames = new Set<AppPage>(['home', 'normal', 'create', 'ai', 'search', 'viewer', 'manage', 'about', 'privacy']);

function normalizeId(value: string): string | undefined {
  const id = value.trim().toUpperCase();
  return id || undefined;
}

function fromRoute(route: string): AppLocation | undefined {
  const cleanRoute = route.replace(/^#\/?/, '').replace(/^\//, '');
  const [segment, rawId] = cleanRoute.split('/');

  if (segment.startsWith('profile-')) {
    const profileId = normalizeId(segment.slice('profile-'.length));
    return profileId ? { page: 'viewer', profileId } : undefined;
  }
  if (segment.startsWith('manage-')) {
    const profileId = normalizeId(segment.slice('manage-'.length));
    return profileId ? { page: 'manage', profileId } : undefined;
  }
  if (segment === 'profile' && rawId) {
    const profileId = normalizeId(rawId);
    return profileId ? { page: 'viewer', profileId } : undefined;
  }
  if (segment === 'manage' && rawId) {
    const profileId = normalizeId(rawId);
    return profileId ? { page: 'manage', profileId } : undefined;
  }

  return pageNames.has(segment as AppPage) ? { page: segment as AppPage } : undefined;
}

export function parseLocation(location: Pick<Location, 'hash' | 'pathname'>): AppLocation {
  const hashRoute = fromRoute(location.hash);
  if (hashRoute) return hashRoute;
  const pathRoute = location.pathname.startsWith('/profile/') || location.pathname.startsWith('/manage/')
    ? fromRoute(location.pathname)
    : undefined;
  return pathRoute ?? { page: 'home' };
}

export function routeFor(page: AppPage, profileId?: string): string {
  if ((page === 'viewer' || page === 'manage') && profileId) {
    return `#/${page === 'viewer' ? 'profile' : 'manage'}/${encodeURIComponent(profileId)}`;
  }
  return page === 'home' ? '#/' : `#/${page}`;
}
