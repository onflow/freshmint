import getConfig from "next/config";

const {
  publicRuntimeConfig: { appName }
} = getConfig();

const title = `${appName} NFT Drop`;

export default {
  noindex: true, // Remove this before going live.
  title: title,
  description: "",
  openGraph: {
    url: "",
    title: title,
    description: "",
    type: "website",
    locale: "en_IE",
    images: [
      {
        url: "http://placekitten.com/800/600",
        width: 800,
        height: 600,
        alt: "Cats on the Internet",
        type: "image/jpeg"
      }
    ],
    site_name: title
  },
  twitter: {
    handle: "@handle",
    site: "@site",
    cardType: "summary_large_image"
  }
};

export const additionalMetaTags = [
  {
    name: "application-name",
    content: title
  },
  {
    name: "apple-mobile-web-app-capable",
    content: "yes"
  },
  {
    name: "apple-mobile-web-app-status-bar-style",
    content: "default"
  },
  {
    name: "apple-mobile-web-app-title",
    content: title
  },
  {
    name: "format-detection",
    content: "telephone=no"
  },
  {
    name: "mobile-web-app-capable",
    content: "yes"
  },
  {
    name: "msapplication-config",
    content: "/icons/browserconfig.xml"
  },
  {
    name: "msapplication-TileColor",
    content: "#2B5797"
  },
  {
    name: "msapplication-tap-highlight",
    content: "no"
  },
  {
    name: "theme-color",
    content: "#000000"
  }
];

export const additionalLinkTags = [
  {
    rel: "icon",
    href: "/favicon.ico"
  },
  { rel: "manifest", href: "/manifest.json" },
  {
    rel: "apple-touch-icon",
    href: "/icons/touch-icon-iphone.png"
  },
  {
    rel: "apple-touch-icon",
    sizes: "152x152"
  },
  {
    rel: "apple-touch-icon",
    sizes: "180x180",
    href: "/icons/touch-icon-iphone-retina.png"
  },
  {
    rel: "apple-touch-icon",
    sizes: "167x167",
    href: "/icons/touch-icon-ipad-retina.png"
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "32x32",
    href: "/icons/favicon-32x32.png"
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "16x16",
    href: "/icons/favicon-16x16.png"
  },
  {
    rel: "mask-icon",
    href: "/icons/safari-pinned-tab.svg",
    color: "#5bbad5"
  },
  {
    rel: "apple-touch-startup-image",
    href: "/images/apple_splash_2048.png",
    sizes: "2048x2732"
  },
  {
    rel: "apple-touch-startup-image",
    href: "/images/apple_splash_1668.png",
    sizes: "1668x2224"
  },
  {
    rel: "apple-touch-startup-image",
    href: "/images/apple_splash_1536.png",
    sizes: "1536x2048"
  },
  {
    rel: "apple-touch-startup-image",
    href: "/images/apple_splash_1125.png",
    sizes: "1125x2436"
  },
  {
    rel: "apple-touch-startup-image",
    href: "/images/apple_splash_1242.png",
    sizes: "1242x2208"
  },
  {
    rel: "apple-touch-startup-image",
    href: "/images/apple_splash_750.png",
    sizes: "750x1334"
  },
  {
    rel: "apple-touch-startup-image",
    href: "/images/apple_splash_640.png",
    sizes: "640x1136"
  }
];
