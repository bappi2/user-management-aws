package com.usermanagement.api.users;

/** Subscription tier, stored as a string ("FREE", "PRO") on USER#<sub>/PROFILE. Declaration order = rank. */
public enum Tier {
    FREE,
    PRO;

    /**
     * Reads the stored value. Missing (profiles created before 4.3) or unknown (typo, newer tier) → FREE:
     * when unsure, grant the least access.
     */
    public static Tier fromStored(String value) {
        if (value == null) {
            return FREE;
        }
        try {
            return Tier.valueOf(value);
        } catch (IllegalArgumentException e) {
            return FREE;
        }
    }

    /** PRO includes FREE features; FREE doesn't include PRO. */
    public boolean includes(Tier required) {
        return this.compareTo(required) >= 0;
    }
}
