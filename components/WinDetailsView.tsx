/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { formatEther } from "viem";
import { Address } from "viem";
import { base } from "viem/chains";
import { getName } from "@coinbase/onchainkit/identity";
import { useEffect, useState } from "react";
import { RandomColorAvatar } from "./RandomAvatar";
import { SafeExternalLink } from "./SafeExternalLink";
import { ExternalLink } from "lucide-react";
import { formatURL } from "@/utils/helperFunctions";
import useEthPrice from "@/hooks/useEthPrice";

type AuctionType = {
  tokenId: bigint;
  winner: string;
  amount: bigint;
  url: string;
  openDialog: (url: string) => boolean;
  openBids: () => void;
};

export function WinDetailsView(winnerdata: AuctionType) {
  const [ensName, setENSname] = useState<string>(
    `${winnerdata.winner.slice(0, 4)}...${winnerdata.winner.slice(-4)}`
  );
  const [ogImage, setOgImage] = useState<string | null>(null);

  const {
    ethPrice: price,
    isLoading: isPriceLoading,
    isError: isPriceError,
  } = useEthPrice();

  // Parse the ETH balance and the current price
  const ethBalance = Number(formatEther(winnerdata.amount));
  const ethPrice = price?.ethereum?.usd ?? 0;
  const usdBalance = ethBalance * ethPrice;

  useEffect(() => {
    const fetchData = async () => {
      const name = await getName({
        address: winnerdata.winner as Address,
        chain: base,
      });

      setENSname(
        name ||
          `${winnerdata.winner.slice(0, 4)}...${winnerdata.winner.slice(-4)}`
      );
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerdata.tokenId]);

  useEffect(() => {
    async function fetchOgImage() {
      try {
        const res = await fetch(`/api/og?url=${winnerdata.url}`);
        const data = await res.json();
        console.log(data);
        if (data.error) {
          setOgImage(
            `${String(process.env.NEXT_PUBLIC_HOST_URL)}/opgIMage.png`
          );
        } else {
          if (data.image !== "") {
            setOgImage(data.image);
          } else {
            setOgImage(
              `${String(process.env.NEXT_PUBLIC_HOST_URL)}/opgIMage.png`
            );
          }
        }
      } catch (err) {
      } finally {
      }
    }
    fetchOgImage();
  }, [winnerdata.url]);

  return (
    <>
      <div className="flex flex-row justify-between items-start gap-1">
        <div className="w-full">
          <div className="flex flex-row gap-2">
            <div className="text-gray-600">Winning bid</div>
            <button
              onClick={winnerdata.openBids}
              className="text-gray-600 underline text-left"
            >
              see bids
            </button>
          </div>
          <div className="inline-flex flex-row justify-center items-center gap-1">
            <div className="text-xl font-bold">
              {formatEther(winnerdata?.amount || 0n)} ETH
            </div>
            <div className="text-xl md:text-md font-medium text-gray-600">
              {usdBalance !== 0 && `($${usdBalance.toFixed(0)})`}
            </div>
          </div>
        </div>
        <div>
          <div className="text-gray-600 text-right">Won by</div>
          <div className="flex items-center gap-2">
            <RandomColorAvatar />
            <span>{ensName}</span>
          </div>
        </div>
      </div>

      {winnerdata.url !== "" && winnerdata.url !== "0x" && (
        <div className="flex flex-col mt-6 p-3 bg-green-50 border border-green-100 rounded-md h-full md:h-[236px]">
          <div className="inline-flex flex-row justify-between items-center w-full">
            <div className="text-sm">
              <span className="text-gray-600">Winning bid: </span>
              <SafeExternalLink
                href={winnerdata.url}
                className="font-medium text-gray-700 hover:text-gray-900 transition-colors inline-flex items-center"
                onBeforeNavigate={() => false}
              >
                {formatURL(winnerdata.url)}
                <ExternalLink className="ml-1 h-3 w-3" />
              </SafeExternalLink>
            </div>
          </div>
          <div className="flex flex-col rounded-md justify-center items-center h-full mt-1 w-full overflow-hidden bg-white aspect-[2/1]">
            {ogImage && (
              <img
                src={ogImage}
                alt="Open Graph"
                className="h-auto w-full"
                onClick={() => {
                  window.location.href = winnerdata.url;
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
