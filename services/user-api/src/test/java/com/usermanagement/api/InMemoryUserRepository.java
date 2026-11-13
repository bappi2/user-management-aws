package com.usermanagement.api;

import com.usermanagement.api.users.User;
import com.usermanagement.api.users.UserRepository;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;


/** Test double for UserRepository. Same contract as the DynamoDB one (1.4b). */
class InMemoryUserRepository implements UserRepository {

    private final Map<String, User> usersById = new HashMap<>();

    @Override
    public boolean insert(User user) {
        return usersById.putIfAbsent(user.id(), user) == null;
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
