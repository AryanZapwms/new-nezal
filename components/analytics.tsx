// components/analytics.tsx
'use client';

import Script from 'next/script';

const GA_IDS = [
  process.env.NEXT_PUBLIC_GA_ID,        
  process.env.NEXT_PUBLIC_GT_ID_1,      
  process.env.NEXT_PUBLIC_ADS_ID,       
  process.env.NEXT_PUBLIC_GT_ID_2,      
].filter(Boolean)

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID 

export function Analytics() {
  return (
    <>
      {/* Google tag (gtag.js) — loaded once, registers all 4 IDs */}
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_IDS[0]}`}
        strategy="afterInteractive"
      />
      <Script id="ga-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          ${GA_IDS.map((id) => `gtag('config', '${id}');`).join('\n')}
        `}
      </Script>

      {/* Facebook / Meta Pixel */}
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