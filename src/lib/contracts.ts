export const DEPLOYER_ADDRESS =
  process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS || "";

export const STACKS_NETWORK =
  (process.env.NEXT_PUBLIC_STACKS_NETWORK as "testnet" | "mainnet") ||
  "mainnet";

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
  vaultV3: {
    address: DEPLOYER_ADDRESS,
    name: "halo-vault-v3",
  },
  usdcx: {
    address: "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE",
    name: "usdcx",
  },
  realSbtc: {
    address: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4",
    name: "sbtc-token",
  },
} as const;

// Asset type IDs matching halo-vault-v3.clar constants
export const VAULT_V3_ASSET_TYPES = {
  USDCX: 0,
  SBTC: 1,
  STX: 2,
  HUSD: 3,
} as const;

// Token decimals per asset
export const TOKEN_DECIMALS: Record<number, number> = {
  [VAULT_V3_ASSET_TYPES.USDCX]: 6,
  [VAULT_V3_ASSET_TYPES.SBTC]: 8,
  [VAULT_V3_ASSET_TYPES.STX]: 6,
  [VAULT_V3_ASSET_TYPES.HUSD]: 6,
};

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
