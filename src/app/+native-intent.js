// iOS dev-client and production bundles hand Expo Router the Metro bundle URL
// or /_sitemap. Android's initial URL falls through to the app root.
export function redirectSystemPath({ path }) {
  try {
    const value = typeof path === 'string' ? path : '';
    const lower = value.toLowerCase();
    if (
      !value ||
      lower.includes('_sitemap') ||
      lower.includes('entry.bundle') ||
      lower.includes('node_modules/expo-router') ||
      lower.includes('expo-development-client')
    ) {
      return '/';
    }
    return path;
  } catch {
    return '/';
  }
}
