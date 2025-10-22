export const AllRouteNames = [
  'Main',
  'Home',
  'Recently Played',
  'Schedule',
  'About',
  'ShowDetails',
] as const;

export type WmbrRouteName = typeof AllRouteNames[number];

export function isWmbrRouteName(input: any): input is WmbrRouteName {
  return typeof input === 'string' && (AllRouteNames as readonly string[]).includes(input);
}

export function assertWmbrRouteName(input: any): asserts input is WmbrRouteName {
  if (!isWmbrRouteName(input)) {
    throw new Error('Invalid route name: ' + String(input) + '. Must be one of: ' + AllRouteNames.join(', '));
  }
}
