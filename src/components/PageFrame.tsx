import type {ReactNode} from 'react';
import {Center} from '@astryxdesign/core/Center';
import {VStack} from '@astryxdesign/core/Layout';

export function PageFrame({children}: {children: ReactNode}) {
  return (
    <Center axis="horizontal" width="100%">
      <VStack maxWidth={960} width="100%" padding={4} gap={0}>
        {children}
      </VStack>
    </Center>
  );
}
