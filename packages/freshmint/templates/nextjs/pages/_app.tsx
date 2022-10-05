import type { AppProps } from 'next/app';
import { ChakraProvider } from '@chakra-ui/react';

// @ts-ignore
import * as fcl from '@onflow/fcl';

fcl.config().put('accessNode.api', 'http://localhost:8888').put('discovery.wallet', 'http://localhost:8701/fcl/authn');

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}
