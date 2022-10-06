import { useRouter } from 'next/router';
import { Box, Text, Button, Code } from '@chakra-ui/react';
import { useFCL, useScript, useTransaction, TransactionResult } from '@freshmint/react';

import getDrop from '../../cadence/scripts/get_drop.cdc';
import claimNFT from '../../cadence/transactions/claim_nft.cdc';

interface DropInfo {
  id: string;
  supply: number;
  size: number;
  price: number;
  paymentType: string;
}

function parseDropResult(result: any | null): DropInfo | null {
  if (result === null) {
    return null;
  }

  return {
    id: result.id,
    supply: parseInt(result.supply, 10),
    size: parseInt(result.size, 10),
    price: parseFloat(result.price),
    paymentType: result.paymentVaultType.typeID,
  };
}

function parseClaimResult(result: TransactionResult): string {
  const event = result.events.find((e) => e.type.includes('FreshmintClaimSale.NFTClaimed'))!;
  return event.data.nftID;
}

interface DropProps {
  address: string;
  id?: string;
}

export default function NFTDrop({ address, id = 'default' }: DropProps) {
  const router = useRouter();
  const { currentUser } = useFCL();

  const [drop, isLoading] = useScript({ cadence: getDrop, args: [address, id] }, parseDropResult);

  const [nftId, claim] = useTransaction(claimNFT, parseClaimResult);

  if (nftId && currentUser) {
    router.push(`/nfts/${currentUser.address}/${nftId}`);
  }

  if (isLoading || !drop) {
    return null;
  }

  return (
    <Box mb={4}>
      <Text fontSize="lg" mb={4} color="gray">
        {drop.supply > 0 ? `${drop.supply} / ${drop.size} NFTs available.` : `All ${drop.size} NFTs have been claimed.`}
      </Text>
      <Button disabled={drop.supply === 0} colorScheme="blue" size="lg" onClick={() => claim(address, id)}>
        {drop.supply > 0 ? `Claim for ${drop.price} FLOW` : 'Drop is sold out'}
      </Button>
    </Box>
  );
}
