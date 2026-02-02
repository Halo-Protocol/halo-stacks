import { type ClarityValue, contractPrincipalCV, uintCV } from "@stacks/transactions";

export const CONTRACTS = [
  "halo-sip010-trait",
  "halo-identity",
  "halo-mock-token",
  "halo-mock-sbtc",
  "halo-credit",
  "halo-vault",
  "halo-sbtc-staking",
  "halo-circle",
] as const;

export type ContractName = (typeof CONTRACTS)[number];

export interface AuthorizationCall {
  contractName: string;
  functionName: string;
  description: string;
  buildArgs: (deployer: string) => ClarityValue[];
}

export function getAuthorizationCalls(deployer: string): AuthorizationCall[] {
  return [
    {
      contractName: "halo-credit",
      functionName: "authorize-contract",
      description: "Authorize halo-circle in halo-credit",
      buildArgs: () => [contractPrincipalCV(deployer, "halo-circle")],
    },
    {
      contractName: "halo-credit",
      functionName: "authorize-contract",
      description: "Authorize halo-sbtc-staking in halo-credit",
      buildArgs: () => [contractPrincipalCV(deployer, "halo-sbtc-staking")],
    },
    {
      contractName: "halo-vault",
      functionName: "authorize-contract",
      description: "Authorize halo-circle in halo-vault",
      buildArgs: () => [contractPrincipalCV(deployer, "halo-circle")],
    },
    {
      contractName: "halo-vault",
      functionName: "set-vault-token",
      description: "Set vault token to halo-mock-token",
      buildArgs: () => [contractPrincipalCV(deployer, "halo-mock-token")],
    },
    {
      contractName: "halo-vault",
      functionName: "set-token-price",
      description: "Set STX price to $0.50 (6 decimals)",
      buildArgs: () => [
        contractPrincipalCV(deployer, deployer.split(".")[0] || deployer),
        uintCV(500000),
        uintCV(6),
      ],
    },
    {
      contractName: "halo-sbtc-staking",
      functionName: "set-staking-token",
      description: "Set staking token to halo-mock-sbtc",
      buildArgs: () => [contractPrincipalCV(deployer, "halo-mock-sbtc")],
    },
  ];
}

export interface VerificationCheck {
  contractName: string;
  functionName: string;
  args: [];
  description: string;
  expectedField?: string;
}

export const VERIFICATION_CHECKS: VerificationCheck[] = [
  {
    contractName: "halo-identity",
    functionName: "get-admin",
    args: [],
    description: "Identity admin is deployer",
  },
  {
    contractName: "halo-identity",
    functionName: "get-total-users",
    args: [],
    description: "Identity total users is 0",
  },
  {
    contractName: "halo-credit",
    functionName: "get-admin",
    args: [],
    description: "Credit admin is deployer",
  },
  {
    contractName: "halo-circle",
    functionName: "get-admin",
    args: [],
    description: "Circle admin is deployer",
  },
  {
    contractName: "halo-circle",
    functionName: "get-circle-count",
    args: [],
    description: "Circle count is 0",
  },
  {
    contractName: "halo-circle",
    functionName: "get-protocol-fee-rate",
    args: [],
    description: "Protocol fee rate is 100 (1%)",
  },
  {
    contractName: "halo-vault",
    functionName: "get-admin",
    args: [],
    description: "Vault admin is deployer",
  },
  {
    contractName: "halo-vault",
    functionName: "get-ltv-ratio",
    args: [],
    description: "LTV ratio is 8000 (80%)",
  },
];
