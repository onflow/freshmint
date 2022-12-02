import { Box, Heading } from '@chakra-ui/react';
import { useScript } from '@freshmint/react';
import Image from 'next/image';

import getNFT from '../../cadence/scripts/get_nft.cdc';

export default function NFTCard({ address, nftId }: { address: string; nftId: string }) {
  const [nft, isLoading] = useScript({ cadence: getNFT, args: [address, nftId] });

  if (isLoading) {
    return <></>;
  }

  return (
    <Box maxW="sm" overflow="hidden">
      <Box mb={2}>
        <Image
          width={160}
          height={160}
          src={`https://nftstorage.link/ipfs/${nft.display.thumbnail.cid}`}
          alt={nft.display.description}
        />
      </Box>
      <Heading as="h2" size="sm" mb={0}>
        {nft.display.name}
      </Heading>
    </Box>
  );
}
