import { NextSeo } from "next-seo";

import Head from "next/head";

import seoConfig, {
  additionalLinkTags,
  additionalMetaTags
} from "../seo.config";
import "../styles/globals.css";

function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Freshmint</title>
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
