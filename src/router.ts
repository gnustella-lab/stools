import {useEffect, useState} from 'react';

export interface HomeRoute {
  name: 'home';
}

export interface PrivacyRoute {
  name: 'privacy';
}

export interface ToolRoute {
  name: 'tool';
  id: string;
}

export type Route = HomeRoute | PrivacyRoute | ToolRoute;

function parse(hash: string): Route {
  const segments = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (segments[0] === 'privacy') {
    return {name: 'privacy'};
  }
  if (segments[0] === 'tool' && segments[1]) {
    return {name: 'tool', id: segments[1]};
  }
  return {name: 'home'};
}

export function toolHref(id: string): string {
  return `#/tool/${id}`;
}

export const HOME_HREF = '#/';
export const PRIVACY_HREF = '#/privacy';

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo({top: 0});
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}
