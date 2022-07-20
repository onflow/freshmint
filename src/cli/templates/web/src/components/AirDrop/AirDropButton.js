function getColor(error) {
  return error ? "bg-red-600" : "bg-black";
}

function getText(nftId, isLoading, error) {
  if (error) return "Error";
  if (isLoading) return "Loading...";
  return `Claim NFT #${nftId}`;
}

function getDisabled(isLoading, error) {
  return isLoading || error;
}

export default function AirDropButton({ 
  onClick,
  nftId,
  isLoading,
  error 
}) {
  const color = getColor(error);
  const text = getText(nftId, isLoading, error);
  const disabled = getDisabled(isLoading, error);

  return (
    <button
      className={`${color} ${disabled && "disabled:opacity-50"} text-xl text-white px-4 py-3 mx-2 rounded-md`}
      onClick={onClick}
      disabled={disabled}>
      {text}
    </button>
  );
}
