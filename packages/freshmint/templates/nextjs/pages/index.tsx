import Image from 'next/image';
import { NextPage } from 'next/types';
import { Box, Container, Heading, Text } from '@chakra-ui/react';

import coverImage from '../public/banner.png';
import NFTDrop from '../components/NFTDrop';
import UserInfo from '../components/UserInfo';

const Home: NextPage = () => {
  return (
    <Container maxWidth={800} my={16} textAlign="center">
      <Box display="inline-block" width={270} mb={5}>
        <Image src={coverImage} alt={process.env.projectDescription} layout="responsive" />
      </Box>
      <Heading as="h1" size="lg" mb={3}>
        {process.env.projectName}
      </Heading>
      <Text fontSize="lg" mb={3}>
        {process.env.projectDescription}
      </Text>
      <NFTDrop address="0xf8d6e0586b0a20c7" />
      <UserInfo />
    </Container>
  );
};

export default Home;
