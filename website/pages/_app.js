import { NextSeo } from "next-seo";

import Head from "next/head";
import getConfig from "next/config";

import seoConfig, {
  additionalLinkTags,
  additionalMetaTags
} from "../seo.config";
import "../styles/globals.css";

const {
  publicRuntimeConfig: { appName }
} = getConfig();

function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>{appName} NFT Drop</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <NextSeo
        {...seoConfig}
        additionalLinkTags={additionalLinkTags}
        additionalMetaTags={additionalMetaTags}
      />
      <Component {...pageProps} />
    </>
  );
}

export default App;
