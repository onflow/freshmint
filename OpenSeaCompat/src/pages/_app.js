import { NextSeo } from "next-seo";
import Head from "next/head";
import getConfig from "next/config";
import "../styles/global.css";

import seoConfig from "../../seo-config.js";
import "../fcl.config";

const { publicRuntimeConfig: { appName } } = getConfig();

function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>{appName} NFT Drop</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <link rel="icon" href="/favicon.png" />
      </Head>

      <NextSeo {...seoConfig} />
      <Component {...pageProps} />
    </>
  );
}

export default App;
