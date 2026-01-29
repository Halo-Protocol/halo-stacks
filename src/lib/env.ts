const REQUIRED_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "HALO_ID_SALT",
  "DEPLOYER_ADDRESS",
] as const;

const OPTIONAL_VARS = [
  "DEPLOYER_PRIVATE_KEY",
  "ADMIN_API_KEY",
] as const;

let validated = false;

export function validateEnv(): void {
  if (validated) return;
  // Skip during Next.js build phase
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  validated = true;

  const missing: string[] = [];
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  for (const key of OPTIONAL_VARS) {
    if (!process.env[key]) {
      console.warn(`[env] Optional variable ${key} is not set`);
    }
  }
}
