export const DEPLOYER_ADDRESS =
  process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS || "";

export const STACKS_NETWORK =
  (process.env.NEXT_PUBLIC_STACKS_NETWORK as "testnet" | "mainnet") ||
  "testnet";

export const CONTRACTS = {
  identity: {
    address: DEPLOYER_ADDRESS,
    name: "halo-identity",
  },
  credit: {
    address: DEPLOYER_ADDRESS,
    name: "halo-credit",
  },
  circle: {
    address: DEPLOYER_ADDRESS,
    name: "halo-circle",
  },
  vault: {
    address: DEPLOYER_ADDRESS,
    name: "halo-vault",
  },
  mockToken: {
    address: DEPLOYER_ADDRESS,
    name: "halo-mock-token",
  },
  mockSbtc: {
    address: DEPLOYER_ADDRESS,
    name: "halo-mock-sbtc",
  },
  vaultV2: {
    address: DEPLOYER_ADDRESS,
    name: "halo-vault-v2",
  },
  circleV2: {
    address: DEPLOYER_ADDRESS,
    name: "halo-circle-v2",
  },
} as const;

export const BLOCKS_PER_DAY = 144;

export function formatSTX(microSTX: string | number | bigint): string {
  const amount = Number(BigInt(microSTX)) / 1_000_000;
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

export function formatAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
