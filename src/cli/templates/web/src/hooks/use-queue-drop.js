import { useState, useEffect } from "react";
import getDrop from "../flow/queue/get_drop";

export default function useQueueDrop(address, isLoading) {
  const [drop, setDrop] = useState({ loading: true, notFound: undefined });

  useEffect(() => {
    const fetchDrop = async () => {
      try {
        const drop = await getDrop(address);
        drop ? setDrop(drop) : setDrop({ loading: false, notFound: true });
      } catch (e) {
        setDrop({ loading: false, notFound: true });
      }
    };

    fetchDrop();
  }, [isLoading]);

  return drop;
}
