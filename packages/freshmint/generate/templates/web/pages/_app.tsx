import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ChakraProvider } from '@chakra-ui/react';

// @ts-ignore
import * as fcl from '@onflow/fcl';

const origin = typeof window !== 'undefined' ? window.location.origin : '';

fcl
  .config()
  .put('flow.network', process.env.FLOW_NETWORK)
  .put('accessNode.api', process.env.ACCESS_API)
  .put('discovery.wallet', process.env.WALLET_DISCOVERY)
  .put('app.detail.icon', `${origin}/banner.png`)
  .put('app.detail.title', process.env.NAME);

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <Head>
        <title>{process.env.NAME}</title>
      </Head>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}
