import type { Tier } from '../api';

/** Shown instead of a feature the user's tier doesn't include. No payments yet (Stripe comes later). */
export function UpgradePrompt({ required }: { required: Tier }) {
  return (
    <div className="upgrade">
      <h3>🔒 {required} feature</h3>
      <p>This feature is part of the {required} plan.</p>
      <p className="hint">Upgrades aren't available yet. Paid plans are coming soon.</p>
    </div>
  );
}
