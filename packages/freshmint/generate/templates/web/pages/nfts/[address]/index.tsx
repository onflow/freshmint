import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Box, Wrap, WrapItem, Container, Flex, Heading, Text, Button } from '@chakra-ui/react';
import { useScript } from '@freshmint/react';

import NFTCard from '../../../components/NFTCard';
import getNFTs from '../../../../cadence/scripts/get_nfts.cdc';

const NFT: NextPage = () => {
  const { query, isReady } = useRouter();
  const { address } = query;

  const [ids, isLoading] = useScript(isReady ? { cadence: getNFTs, args: [address] } : null);

  if (!isReady || isLoading) {
    return <></>;
  }

  return (
    <Flex minH="100vh" alignItems="center">
      <Container maxW={800} py={8} textAlign="center">
        <Box mb={8}>
          <Heading as="h1" size="lg" my={2}>
            {process.env.NAME}
          </Heading>
          <Text fontSize="md" mb={4}>
            {process.env.DESCRIPTION}
          </Text>
          <Text fontSize="md" color="gray">{`Account ${address} owns ${ids.length} NFTs from this collection.`}</Text>
        </Box>
        <Wrap my={12} spacing={10} justify="center">
          {ids.map((nftId: string) => (
            <WrapItem key={nftId} width="160px">
              <Link href={`/nfts/${address}/${nftId}`}>
                <a>
                  <NFTCard address={address as string} nftId={nftId} />
                </a>
              </Link>
            </WrapItem>
          ))}
        </Wrap>
        <Box textAlign="center">
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
