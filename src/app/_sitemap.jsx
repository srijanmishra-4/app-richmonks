import { Redirect } from 'expo-router';

// The generated sitemap reads window.location.origin. A production iOS bundle
// has no location, so opening that screen crashes. Send the launch here instead.
export default function SitemapRedirect() {
  return <Redirect href="/" />;
}
