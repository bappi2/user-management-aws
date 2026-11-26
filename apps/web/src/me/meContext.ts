import { createContext, useContext } from 'react';
import type { Me, Tier } from '../api';


export type MeState = {
  me: Me | null;                       // null while loading (or after an error)
  error: string | null;
  reload: () => Promise<void>;         // after an upgrade / tutorial finish
};

export const MeContext = createContext<MeState | null>(null);

export function useMe(): MeState {
  const value = useContext(MeContext);
  if (!value) {
    throw new Error('useMe must be used inside <MeProvider>');
  }
  return value;
}


/** Same rule as Java Tier.includes (order = rank). UI hint only: the API enforces it. */
const TIER_ORDER: readonly Tier[] = ['FREE', 'PRO'];

export function hasTier(me: Me | null, required: Tier): boolean {
  if (!me) return false;
  const have = TIER_ORDER.indexOf(me.tier);
  return have >= 0 && have >= TIER_ORDER.indexOf(required);   // unknown tier (-1) → no access
}
