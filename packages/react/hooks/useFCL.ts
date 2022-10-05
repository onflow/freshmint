import React, { useEffect } from 'react';

// @ts-ignore
import * as fcl from '@onflow/fcl';

import { FCLModule, FCLUser } from '../fcl';

export interface FCL {
  fcl: FCLModule;
  login: any;
  logIn: any;
  logout: any;
  logOut: any;
  getNetwork: () => Promise<string>;
  currentUser: FCLUser | null;
}

export function useFCL(): FCL {
  const [currentUser, setCurrentUser] = React.useState<FCLUser | null>(null);

  useEffect(() => {
    // Only subscribe to user updates if running in a browser environment
    if (typeof window === 'object') {
      fcl.currentUser().subscribe((user: any) => {
        if (!user.loggedIn) {
          return setCurrentUser(null);
        }

        // Add 'address' field to user
        const currentUser: FCLUser = {
          ...user,
          address: user.addr,
        };

        setCurrentUser(currentUser);
      });
    }
  }, []);

  return {
    fcl,
    login: () => fcl.logIn(),
    logIn: () => fcl.logIn(),
    logout: () => fcl.unauthenticate(),
    logOut: () => fcl.unauthenticate(),
    getNetwork: () => fcl.config().get('flow.network', 'emulator'),
    currentUser,
  };
}
