

// components/analytics.tsx
'use client';

import Script from 'next/script';
import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

// Google Tag Manager container ID — this is now the ONLY place GA4 / Google Ads
// tags are registered. Manage those tags inside the GTM-KGB6D4D container in
// tagmanager.google.com, not in code, to avoid double-firing pageviews.
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-KGB6D4D';

export function Analytics() {
  return (
    <>
      {/* Google Tag Manager — handles GA4 + Google Ads config internally */}
      <Script id="gtm-script" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}
      </Script>

      {/* Facebook / Meta Pixel — kept as direct code since it's a separate platform from GTM */}
      <Script id="facebook-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
        fbq('track', 'PageView');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

function RouteChangeTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // The base scripts in <Analytics /> already fire the initial pageview
    // on hard load. Next.js App Router navigations are client-side and don't
    // re-run those scripts, so subsequent route changes are tracked here.
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    // Push a page_view event into GTM's dataLayer instead of calling gtag()
    // directly. GTM's own GA4 tag (configured in tagmanager.google.com)
    // listens for this and fires the real GA4 pageview — keeping GA4 fully
    // owned by GTM, with no duplicate direct gtag calls from code.
    if (typeof window !== 'undefined' && Array.isArray((window as any).dataLayer)) {
      (window as any).dataLayer.push({
        event: 'page_view',
        page_path: url,
        page_location: window.location.href,
        page_title: document.title,
      });
    }

    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'PageView');
    }
  }, [pathname, searchParams]);

  return null;
}

/**
 * Fires page_view / PageView on client-side route changes.
 * Wrapped in Suspense because useSearchParams() requires it in the App Router.
 */
export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <RouteChangeTracker />
    </Suspense>
  );
}

/**
 * GTM's <noscript><iframe> fallback MUST be the first thing after the
 * opening <body> tag (not inside <head>), so it's exported separately
 * and rendered directly in app/layout.tsx.
 */
export function GTMNoScript() {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}




















// // components/analytics.tsx
// 'use client';

// import Script from 'next/script';
// import { Suspense, useEffect, useRef } from 'react';
// import { usePathname, useSearchParams } from 'next/navigation';

// const GA_IDS = [
//   process.env.NEXT_PUBLIC_GA_ID,
//   process.env.NEXT_PUBLIC_GT_ID_1,
//   process.env.NEXT_PUBLIC_ADS_ID,
//   process.env.NEXT_PUBLIC_GT_ID_2,
//   process.env.NEXT_PUBLIC_GT_ID_3,
// ].filter(Boolean)

// const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

// // Google Tag Manager container ID
// export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-KGB6D4D'

// export function Analytics() {
//   return (
//     <>
//       {/* Google Tag Manager */}
//       <Script id="gtm-script" strategy="afterInteractive">
//         {`
//           (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
//           new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
//           j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
//           'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
//           })(window,document,'script','dataLayer','${GTM_ID}');
//         `}
//       </Script>

//       {/* Google tag (gtag.js) — loaded once, registers all IDs */}
//       <Script
//         async
//         src={`https://www.googletagmanager.com/gtag/js?id=${GA_IDS[0]}`}
//         strategy="afterInteractive"
//       />
//       <Script id="ga-config" strategy="afterInteractive">
//         {`
//           window.dataLayer = window.dataLayer || [];
//           function gtag(){dataLayer.push(arguments);}
//           gtag('js', new Date());
//           ${GA_IDS.map((id) => `gtag('config', '${id}');`).join('\n')}
//         `}
//       </Script>

//       {/* Facebook / Meta Pixel */}
//       <Script id="facebook-pixel" strategy="afterInteractive">
//         {`!function(f,b,e,v,n,t,s)
//         {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
//         n.callMethod.apply(n,arguments):n.queue.push(arguments)};
//         if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
//         n.queue=[];t=b.createElement(e);t.async=!0;
//         t.src=v;s=b.getElementsByTagName(e)[0];
//         s.parentNode.insertBefore(t,s)}(window, document,'script',
//         'https://connect.facebook.net/en_US/fbevents.js');
//         fbq('init', '${META_PIXEL_ID}');
//         fbq('track', 'PageView');`}
//       </Script>
//       <noscript>
//         <img
//           height="1"
//           width="1"
//           style={{ display: 'none' }}
//           src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
//           alt=""
//         />
//       </noscript>
//     </>
//   );
// }

// function RouteChangeTracker() {
//   const pathname = usePathname();
//   const searchParams = useSearchParams();
//   const isFirstLoad = useRef(true);

//   useEffect(() => {
//     // The base scripts in <Analytics /> already fire the initial PageView/page_view
//     // on hard load. Next.js App Router navigations are client-side and don't
//     // re-run those scripts, so subsequent route changes are tracked here.
//     if (isFirstLoad.current) {
//       isFirstLoad.current = false;
//       return;
//     }

//     const query = searchParams.toString();
//     const url = query ? `${pathname}?${query}` : pathname;

//     if (typeof window.gtag === 'function') {
//       window.gtag('event', 'page_view', {
//         page_path: url,
//         page_location: window.location.href,
//         page_title: document.title,
//       });
//     }

//     if (typeof window.fbq === 'function') {
//       window.fbq('track', 'PageView');
//     }
//   }, [pathname, searchParams]);

//   return null;
// }

// /**
//  * Fires page_view / PageView on client-side route changes.
//  * Wrapped in Suspense because useSearchParams() requires it in the App Router.
//  */
// export function PageViewTracker() {
//   return (
//     <Suspense fallback={null}>
//       <RouteChangeTracker />
//     </Suspense>
//   );
// }

// /**
//  * GTM's <noscript><iframe> fallback MUST be the first thing after the
//  * opening <body> tag (not inside <head>), so it's exported separately
//  * and rendered directly in app/layout.tsx.
//  */
// export function GTMNoScript() {
//   return (
//     <noscript>
//       <iframe
//         src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
//         height="0"
//         width="0"
//         style={{ display: 'none', visibility: 'hidden' }}
//       />
//     </noscript>
//   );
// }


