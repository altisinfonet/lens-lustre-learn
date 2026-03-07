import { Helmet } from "react-helmet-async";
import { useSEO } from "@/hooks/useSEO";

interface PageSEOProps {
  /** Dynamic page title, e.g. article or course name */
  title?: string;
}

/**
 * Drop-in component that injects <head> meta tags based on
 * admin SEO settings (global + per-page overrides).
 */
const PageSEO = ({ title }: PageSEOProps) => {
  const meta = useSEO(title);

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:site_name" content={meta.siteName} />
      <meta property="og:type" content="website" />
      {meta.ogImage && <meta property="og:image" content={meta.ogImage} />}
      {meta.canonicalUrl && <meta property="og:url" content={meta.canonicalUrl} />}
      {meta.canonicalUrl && <link rel="canonical" href={meta.canonicalUrl} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      {meta.ogImage && <meta name="twitter:image" content={meta.ogImage} />}
      {meta.twitterHandle && <meta name="twitter:site" content={meta.twitterHandle} />}
      {meta.noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      {meta.googleVerification && <meta name="google-site-verification" content={meta.googleVerification} />}
      {meta.bingVerification && <meta name="msvalidate.01" content={meta.bingVerification} />}
    </Helmet>
  );
};

export default PageSEO;
