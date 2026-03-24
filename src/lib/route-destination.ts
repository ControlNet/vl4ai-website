export interface ResolvedRouteDestination {
  href: string;
  external: boolean;
}

export const resolveRouteDestination = (value: string): ResolvedRouteDestination => {
  if (/^https?:\/\//u.test(value)) {
    return {
      href: value,
      external: true,
    };
  }

  if (value.startsWith('mailto:')) {
    return {
      href: value,
      external: false,
    };
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;

  return {
    href: normalizedPath,
    external: false,
  };
};
