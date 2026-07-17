import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Analytics integration component.
 * Renders GA4, Google Search Console verification, and Microsoft Clarity
 * scripts only when the corresponding env vars are set.
 */
export default function Analytics() {
  const ga4Id = (import.meta as any).env?.VITE_GA4_MEASUREMENT_ID;
  const gscVerification = (import.meta as any).env?.VITE_GSC_VERIFICATION;
  const clarityId = (import.meta as any).env?.VITE_CLARITY_ID;

  return (
    <Helmet>
      {/* Google Search Console verification */}
      {gscVerification && (
        <meta name="google-site-verification" content={gscVerification} />
      )}

      {/* Google Analytics 4 with consent mode v2 */}
      {ga4Id && (
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
        />
      )}
      {ga4Id && (
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              analytics_storage: 'denied',
              functionality_storage: 'granted',
              security_storage: 'granted',
              wait_for_update: 500
            });
            gtag('js', new Date());
            gtag('config', '${ga4Id}', { anonymize_ip: true });
          `}
        </script>
      )}

      {/* Microsoft Clarity */}
      {clarityId && (
        <script>
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window,document,"clarity","script","${clarityId}");
          `}
        </script>
      )}
    </Helmet>
  );
}
