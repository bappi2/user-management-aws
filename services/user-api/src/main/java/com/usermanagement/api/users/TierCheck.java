package com.usermanagement.api.users;

import com.usermanagement.api.http.ApiException;

/** One place that turns "tier too low" into 403 Problem Details. */
public final class TierCheck {

    private TierCheck() {}

    public static void require(User user, Tier required) {
        if (!user.tier().includes(required)) {
            throw ApiException.forbidden("Tier.Required",
                    "This feature requires the " + required + " tier (current: " + user.tier() + ")");
        }
    }
}
