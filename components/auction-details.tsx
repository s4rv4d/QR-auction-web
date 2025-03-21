/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import { useCountdown } from "@/hooks/useCountdown";
import { BidHistoryDialog } from "./bid-history-dialog";
import { formatEther } from "viem";
import { HowItWorksDialog } from "./HowItWorksDialog";

import { useFetchSettledAuc } from "@/hooks/useFetchSettledAuc";
import { useFetchAuctionDetails } from "@/hooks/useFetchAuctionDetails";
import { useFetchAuctionSettings } from "@/hooks/useFetchAuctionSettings";
import { useWriteActions } from "@/hooks/useWriteActions";
import { waitForTransactionReceipt } from "@wagmi/core";
import { toast } from "sonner";
import { config } from "@/config/config";
import { BidForm } from "@/components/bid-amount-view";
import { WinDetailsView } from "@/components/WinDetailsView";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccount } from "wagmi";
import { useSafetyDialog } from "@/hooks/useSafetyDialog";
import { SafetyDialog } from "./SafetyDialog";
import useEthPrice from "@/hooks/useEthPrice";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

interface AuctionDetailsProps {
  id: number;
  onPrevious: () => void;
  onNext: () => void;
  isLatest: boolean;
}

type AuctionType = {
  tokenId: bigint;
  winner: string;
  amount: bigint;
  url: string;
};

export function AuctionDetails({
  id,
  onPrevious,
  onNext,
  isLatest,
}: AuctionDetailsProps) {
  const [showBidHistory, setShowBidHistory] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [settledAuctions, setSettledAcustions] = useState<AuctionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { fetchHistoricalAuctions: auctionsSettled } = useFetchSettledAuc();
  const { refetch, auctionDetail } = useFetchAuctionDetails();
  const { refetchSettings, settingDetail } = useFetchAuctionSettings();

  const { settleTxn } = useWriteActions({ tokenId: BigInt(id) });
  const { isConnected, address } = useAccount();
  const { time, isComplete } = useCountdown(
    auctionDetail?.endTime ? Number(auctionDetail.endTime) : 0
  );

  const {
    ethPrice: price,
    isLoading: isPriceLoading,
    isError: isPriceError,
  } = useEthPrice();

  const { isOpen, pendingUrl, openDialog, closeDialog, handleContinue } =
    useSafetyDialog();

  const currentSettledAuction = settledAuctions.find((val) => {
    return Number(val.tokenId) === id;
  });

  const ethBalance = Number(formatEther(auctionDetail?.highestBid ?? 0n));
  const ethPrice = price?.ethereum?.usd ?? 0;
  const usdBalance = ethBalance * ethPrice;

  const handleSettle = useCallback(async () => {
    if (!isComplete) {
      return;
    }

    if (!isConnected) {
      toast.error("Connect a wallet");
      return;
    }

    if (
      ![
        "0x5B759eF9085C80CCa14F6B54eE24373f8C765474",
        "0x5371d2E73edf765752121426b842063fbd84f713",
      ].includes(address as string)
    ) {
      toast.error("Only Admins can settle auction");
      return;
    }

    try {
      const hash = await settleTxn();

      const transactionReceiptPr = waitForTransactionReceipt(config, {
        hash: hash,
      });

      toast.promise(transactionReceiptPr, {
        loading: "Executing Transaction...",
        success: (data: any) => {
          return "New Auction Created";
        },
        error: (data: any) => {
          return "Failed to settle and create new auction";
        },
      });
    } catch (error) {
      console.error(error);
    }
  }, [isComplete, id, auctionDetail]);

  const updateDetails = async () => {
    await refetch();
    await refetchSettings();
  };

  const openBid = () => {
    setShowBidHistory(true);
  };

  useEffect(() => {
    const refetchDetails = async () => {
      await refetch();
      await refetchSettings();

      if (auctionDetail !== undefined) {
        setIsLoading(false);
      }
    };
    setIsLoading(true);
    refetchDetails();
  }, [auctionDetail?.tokenId, id]);

  useEffect(() => {
    const ftSetled = async () => {
      const data = await auctionsSettled();
      if (data !== undefined) {
        setSettledAcustions(data);
      }
    };

    ftSetled();
  }, [isComplete]);

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <div className="flex flex-row justify-between items-center w-full">
          <div className="inline-flex justify-start items-center gap-2">
            <h1 className="text-3xl font-bold">Auction #{id}</h1>
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full border-none ${
                isLatest
                  ? "bg-blue-100 hover:bg-blue-200"
                  : "bg-white hover:bg-gray-100"
              }`}
              onClick={onPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full hover:bg-gray-100 border-none disabled:opacity-50 disabled:hover:bg-transparent"
              onClick={onNext}
              disabled={isLatest}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Info
            size={30}
            onClick={() => setShowHowItWorks(true)}
            className="cursor-pointer"
          />
        </div>
        {isLoading && (
          <div className="flex flex-col space-y-3">
            <Skeleton className="h-[125px] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        )}

        {auctionDetail &&
          Number(auctionDetail.tokenId) === id &&
          !isLoading && (
            <>
              {!auctionDetail.settled ? (
                <>
                  <div className="flex flex-row justify-between gap-8">
                    <div className="space-y-1">
                      <div className="text-gray-600">Current bid</div>
                      <div className="flex flex-row justify-center items-center gap-1">
                        <div className="text-xl md:text-2xl font-bold">
                          {formatEther(
                            auctionDetail?.highestBid
                              ? auctionDetail.highestBid
                              : 0n
                          )}{" "}
                          ETH
                        </div>
                        <div className="text-xl md:text-md font-medium text-gray-600">
                          {usdBalance !== 0 && `($${usdBalance.toFixed(0)})`}
                        </div>
                      </div>
                    </div>
                    {!isComplete && (
                      <div className="space-y-1">
                        <div className="text-gray-600 text-right">
                          Time left
                        </div>
                        <div className="text-xl md:text-2xl font-bold whitespace-nowrap text-right">
                          {time}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {!isComplete && (
                      <BidForm
                        auctionDetail={auctionDetail}
                        settingDetail={settingDetail}
                        onSuccess={updateDetails}
                        openDialog={openDialog}
                      />
                    )}
                    {isComplete && (
                      <Button
                        className="px-8 h-12 bg-gray-900 hover:bg-gray-800"
                        onClick={handleSettle}
                      >
                        Settle and create auction
                      </Button>
                    )}

                    {auctionDetail && auctionDetail.highestBidder && (
                      <div className="flex flex-row text-sm items-start justify-between">
                        <button className="text-gray-600 text-left w-full">
                          Highest bidder: {auctionDetail.highestBidder}
                        </button>
                        <button
                          onClick={() => setShowBidHistory(true)}
                          className="text-gray-600 underline text-right w-[120px]"
                        >
                          All bids
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-gray-600">Winning bid</div>
                      <div className="text-2xl font-bold">
                        {auctionDetail?.highestBid || "0"} ETH
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Won by</div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full" />
                        <span>{auctionDetail?.highestBidder || "Unknown"}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gray-900 hover:bg-gray-800"
                    onClick={() =>
                      window.open(auctionDetail?.qrMetadata.urlString, "_blank")
                    }
                  >
                    Visit Winning Site
                  </Button>

                  <div className="flex flex-row items-center text-sm justify-between">
                    <button
                      onClick={() => setShowBidHistory(true)}
                      className="text-gray-600 underline text-left w-full"
                    >
                      Prev bids
                    </button>
                    <button
                      onClick={() => setShowHowItWorks(true)}
                      className="text-gray-600 underline text-right w-[120px]"
                    >
                      How it works
                    </button>
                  </div>
                </>
              )}
            </>
          )}

        {auctionDetail &&
          Number(auctionDetail.tokenId) !== id &&
          !isLoading && (
            <>
              <WinDetailsView
                tokenId={currentSettledAuction?.tokenId || 0n}
                winner={currentSettledAuction?.winner || "0x"}
                amount={currentSettledAuction?.amount || 0n}
                url={currentSettledAuction?.url || ""}
                openDialog={openDialog}
                openBids={openBid}
              />
            </>
          )}
      </div>

      <BidHistoryDialog
        isOpen={showBidHistory}
        onClose={() => setShowBidHistory(false)}
        auctionId={id}
        latestId={Number(auctionDetail?.tokenId || id)}
        isComplete={isComplete}
        openDialog={openDialog}
      />

      <HowItWorksDialog
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

      <SafetyDialog
        isOpen={isOpen}
        onClose={closeDialog}
        targetUrl={pendingUrl || ""}
        onContinue={handleContinue}
      />
    </div>
  );
}
