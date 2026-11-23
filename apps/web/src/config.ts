export type AppConfig = {
  stage: string;
  region: string;
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  oauthDomain: string;
};

const KEYS = ['stage', 'region', 'apiUrl', 'userPoolId', 'userPoolClientId', 'oauthDomain'] as const;

export const config: AppConfig = { stage: '', region: '', apiUrl: '', userPoolId: '', userPoolClientId: '', oauthDomain: '' };

/**
 * npm run dev  → values from .env.local (scripts/env-from-stack.sh)
 * hosted build → /config.json, written into the bucket by CDK at deploy time
 */
export async function loadConfig(): Promise<void> {
  const loaded: Partial<AppConfig> = import.meta.env.DEV
    ? {
        stage: import.meta.env.VITE_STAGE,
        region: import.meta.env.VITE_AWS_REGION,
        apiUrl: import.meta.env.VITE_API_URL,
        userPoolId: import.meta.env.VITE_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
        oauthDomain: import.meta.env.VITE_OAUTH_DOMAIN,
      }
    : await fetch('/config.json', { cache: 'no-store' }).then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load /config.json (HTTP ${response.status})`);
        }
        return response.json();
      });

  for (const key of KEYS) {
    if (!loaded[key]) {
      throw new Error(`Missing config value "${key}"`);
    }
  }
  Object.assign(config, loaded);
}
