let currentNonce: bigint | null = null;
let pendingInit: Promise<void> | null = null;
let mutexQueue: Promise<bigint> = Promise.resolve(0n);

async function fetchAccountNonce(address: string): Promise<bigint> {
  const apiUrl = process.env.STACKS_API_URL || "https://api.testnet.hiro.so";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${apiUrl}/v2/accounts/${address}?proof=0`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Failed to fetch nonce: ${res.status}`);
    const data = (await res.json()) as { nonce: number };
    return BigInt(data.nonce);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getNextNonce(deployerAddress: string): Promise<bigint> {
  // Chain onto the mutex queue so concurrent callers are serialized
  const noncePromise = mutexQueue.then(async () => {
    if (currentNonce === null) {
      if (!pendingInit) {
        pendingInit = fetchAccountNonce(deployerAddress).then((n) => {
          currentNonce = n;
          pendingInit = null;
        });
      }
      await pendingInit;
    }
    const nonce = currentNonce!;
    currentNonce = nonce + 1n;
    return nonce;
  });

  mutexQueue = noncePromise.then(() => 0n).catch(() => 0n);

  return noncePromise;
}

export function resetNonce(): void {
  currentNonce = null;
  pendingInit = null;
  mutexQueue = Promise.resolve(0n);
}
