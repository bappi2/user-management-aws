package com.usermanagement.api;

import com.usermanagement.api.users.User;
import com.usermanagement.api.users.UserRepository;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Test double for UserRepository. Same contract as the DynamoDB one (1.4b). */
class InMemoryUserRepository implements UserRepository {

    private final Map<String, User> usersById = new HashMap<>();
    private final Set<String> emails = new HashSet<>();

    @Override
    public boolean insert(User user) {
        if (!emails.add(user.email())) {
            return false;
        }
        usersById.put(user.id(), user);
        return true;
    }

    @Override
    public Optional<User> findById(String id) {
        return Optional.ofNullable(usersById.get(id));
    }

    @Override
    public boolean updateName(String id, String firstName, String lastName) {
        User existing = usersById.get(id);
        if (existing == null) {
            return false;
        }
        usersById.put(id, new User(existing.id(), existing.email(), firstName, lastName));
        return true;
    }
}
