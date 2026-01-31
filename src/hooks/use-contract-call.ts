"use client";

import { useState, useCallback } from "react";
import type { ClarityValue } from "@stacks/transactions";
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
      const { openContractCall } = await import("@stacks/connect");
      await openContractCall({
        contractAddress: DEPLOYER_ADDRESS,
        contractName: options.contractName,
        functionName: options.functionName,
        functionArgs: options.functionArgs,
        postConditions: options.postConditions,
        network: STACKS_NETWORK,
        onFinish: (data: { txId: string }) => {
          setState({ loading: false, txId: data.txId, error: null });
          options.onFinish?.(data);
        },
        onCancel: () => {
          setState({ loading: false, txId: null, error: "Transaction cancelled" });
          options.onCancel?.();
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Contract call failed";
      setState({ loading: false, txId: null, error: message });
    }
  }, []);

  return { ...state, call };
}
