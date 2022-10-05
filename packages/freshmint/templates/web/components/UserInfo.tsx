import Link from 'next/link';
import { Text, Button, Flex } from '@chakra-ui/react';
import { useFCL } from '@freshmint/react';

export default function UserInfo() {
  const { login, logout, currentUser } = useFCL();

  if (!currentUser) {
    return (
      <>
        <Text fontSize="md" mb={4} color="gray">
          Already have some?
        </Text>
        <Flex display="inline-block">
          <Button size="sm" mx={1} onClick={() => login()}>
            Connect wallet to view
          </Button>
        </Flex>
      </>
    );
  }

  return (
    <>
      <Text fontSize="md" mb={4} color="gray">{`Logged in as ${currentUser.address}`}</Text>
      <Flex display="inline-block">
        <Link href={`/nfts/${currentUser.address}`}>
          <Button size="sm" mx={1}>
            View your NFTs
          </Button>
        </Link>
        <Button size="sm" mx={1} onClick={() => logout()}>
          Logout
        </Button>
      </Flex>
    </>
  );
}
