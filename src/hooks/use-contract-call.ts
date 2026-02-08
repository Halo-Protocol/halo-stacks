"use client";

import { useState, useCallback } from "react";
import type { ClarityValue } from "@stacks/transactions";
import { request, getStacksProvider } from "@stacks/connect";
import { DEPLOYER_ADDRESS, STACKS_NETWORK } from "../lib/contracts";

interface ContractCallOptions {
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  postConditions?: any[];
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
}

interface ContractCallState {
  loading: boolean;
  txId: string | null;
  error: string | null;
}

export function useContractCall() {
  const [state, setState] = useState<ContractCallState>({
    loading: false,
    txId: null,
    error: null,
  });

  const call = useCallback(async (options: ContractCallOptions) => {
    setState({ loading: true, txId: null, error: null });
    try {
      // Get the wallet extension provider directly — bypasses the
      // @stacks/connect-ui Stencil modal which doesn't render in Next.js
      const provider = getStacksProvider();
      if (!provider) {
        setState({
          loading: false,
          txId: null,
          error: "No Stacks wallet extension found. Please install Leather or Xverse.",
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await request(
        { provider },
        "stx_callContract",
        {
          contract: `${DEPLOYER_ADDRESS}.${options.contractName}`,
          functionName: options.functionName,
          functionArgs: options.functionArgs,
          postConditions: options.postConditions,
          network: STACKS_NETWORK,
        },
      );

      const txId = result.txid || result.txId;
      if (txId) {
        setState({ loading: false, txId, error: null });
        options.onFinish?.({ txId });
      } else {
        setState({ loading: false, txId: null, error: "No transaction ID returned" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Contract call failed";
      // User cancellation from wallet popup
      if (message.includes("cancel") || message.includes("denied") || message.includes("rejected")) {
        setState({ loading: false, txId: null, error: "Transaction cancelled" });
        options.onCancel?.();
      } else {
        setState({ loading: false, txId: null, error: message });
      }
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, txId: null, error: null });
  }, []);

  return { ...state, call, reset };
}
