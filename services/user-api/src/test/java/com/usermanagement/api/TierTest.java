package com.usermanagement.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.usermanagement.api.users.Tier;
import org.junit.jupiter.api.Test;

class TierTest {

    @Test
    void missingTierIsFree() {
        assertEquals(Tier.FREE, Tier.fromStored(null));   // profiles created before 4.3
    }

    @Test
    void unknownTierIsFree() {
        assertEquals(Tier.FREE, Tier.fromStored("GOLD")); // fail closed
        assertEquals(Tier.PRO, Tier.fromStored("PRO"));
    }

    @Test
    void proIncludesFreeButNotTheOtherWayRound() {
        assertTrue(Tier.PRO.includes(Tier.FREE));
        assertTrue(Tier.PRO.includes(Tier.PRO));
        assertFalse(Tier.FREE.includes(Tier.PRO));
    }
}
