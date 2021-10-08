import getConfig from "next/config";

const { publicRuntimeConfig: { appName } } = getConfig();

const title = `${appName} NFT Drop`;

export default {
  noindex: true, // Remove this before going live.
  title: publicRuntimeConfig.appName,
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
    site_name: title,
  },
  twitter: {
    handle: "@handle",
    site: "@site",
    cardType: "summary_large_image"
  }
};
