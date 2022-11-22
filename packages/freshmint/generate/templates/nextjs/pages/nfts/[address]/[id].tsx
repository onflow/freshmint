import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { Box, Button, Container, Flex, Heading, Text } from '@chakra-ui/react';
import { useScript } from '@freshmint/react';

import getNFT from '../../../../cadence/scripts/get_nft.cdc';

const NFT: NextPage = () => {
  const { query, isReady } = useRouter();
  const { address, id } = query;

  const [nft, isLoading] = useScript(isReady ? { cadence: getNFT, args: [address, id] } : null);

  if (!isReady || isLoading) {
    return <></>;
  }

  return (
    <Flex minH="100vh" alignItems="center">
      <Container maxW={800} py={8} textAlign="center">
        <Box display="inline-block" width={270}>
          <Image
            width={270}
            height={270}
            src={`https://nftstorage.link/ipfs/${nft.display.thumbnail.cid}`}
            alt={nft.display.description}
          />
        </Box>
        <Box mt={4} mb={6}>
          <Heading as="h1" size="lg" mb={2}>
            {nft && nft.display.name}
          </Heading>
          <Text fontSize="lg" mb={4}>
            {nft && nft.display.description}
          </Text>
          <Text fontSize="lg" mb={6} color="gray">
            {nft && `Owner: ${address}`}
          </Text>
          <Link href="/">
            <Button as="a" size="sm" cursor="pointer">
              Back to home
            </Button>
          </Link>
        </Box>
      </Container>
    </Flex>
  );
};

export default NFT;
