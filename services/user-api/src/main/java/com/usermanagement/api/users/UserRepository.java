package com.usermanagement.api.users;

import java.util.Optional;

/** Evently: IUserRepository. DynamoDB implementation in 1.4b; in-memory one in tests. */
public interface UserRepository {

    /** @return false if the email is already registered */
    boolean insert(User user);

    Optional<User> findById(String id);

    /** @return false if no user with this id exists */
    boolean updateName(String id, String firstName, String lastName);
}
