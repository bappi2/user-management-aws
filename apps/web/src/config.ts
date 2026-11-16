type EnvKey = keyof ImportMetaEnv & `VITE_${string}`;

function required(name: EnvKey): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Run: scripts/env-from-stack.sh beta`);
  }
  return value;
}

export const config = {
  stage: required('VITE_STAGE'),
  region: required('VITE_AWS_REGION'),
  apiUrl: required('VITE_API_URL'),
  userPoolId: required('VITE_USER_POOL_ID'),
  userPoolClientId: required('VITE_USER_POOL_CLIENT_ID'),
} as const;
