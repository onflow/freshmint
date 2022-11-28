declare module '*.cdc' {
  const cadence: {
    raw: string;
    resolve: (network: string, overides?: { [contractName: string]: string }) => string;
  };
  export = cadence;
}
