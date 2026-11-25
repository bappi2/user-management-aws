package com.usermanagement.api.users;

/** Evently: Domain/Users/User.cs (no roles yet, no domain events). tier added in 4.3, tutorialVersion in 4.3d. */
public record User(String id, String email, String firstName, String lastName, Tier tier, int tutorialVersion) {}

