export function generateOutfileNames(network: string): { outFile: string; tempFile: string } {
  const timestamp = generateTimestamp();

  return {
    outFile: `mint-${network}-${timestamp}.csv`,
    tempFile: `mint-${network}-${timestamp}.tmp.csv`,
  };
}

function generateTimestamp(): string {
  const date = new Date();
  return `${date.getFullYear()}-${
    date.getMonth() + 1
  }-${date.getDate()}-${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
}
