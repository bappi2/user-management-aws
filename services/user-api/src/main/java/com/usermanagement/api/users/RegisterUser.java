package com.usermanagement.api.users;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.usermanagement.api.Endpoint;
import com.usermanagement.api.http.ApiException;
import com.usermanagement.api.http.HttpResponses;
import com.usermanagement.api.http.Json;
import com.usermanagement.api.http.Validation;
import java.util.Locale;
import java.util.UUID;

/** Evently: Presentation/Users/RegisterUser.cs + RegisterUserCommandValidator + handler. */
public final class RegisterUser implements Endpoint {

    public record Request(String email, String password, String firstName, String lastName) {}

    public record Response(String id) {}

    private final UserRepository users;

    public RegisterUser(UserRepository users) {
        this.users = users;
    }

    @Override
    public String routeKey() {
        return "POST /v1/users/register";
    }

    @Override
    public APIGatewayProxyResponseEvent handle(APIGatewayProxyRequestEvent event) {
        Request request = Json.read(event.getBody(), Request.class);

        // Evently: RegisterUserCommandValidator
        new Validation()
                .notBlank("FirstName", request.firstName())
                .notBlank("LastName", request.lastName())
                .email("Email", request.email())
                .minLength("Password", request.password(), 6)
                .throwIfInvalid();

        // Password is validated but NOT stored. Cognito will own credentials (like Keycloak in Evently).
        User user = new User(
                UUID.randomUUID().toString(),
                request.email().trim().toLowerCase(Locale.ROOT),
                request.firstName().trim(),
                request.lastName().trim());

        if (!users.insert(user)) {
            throw ApiException.conflict("Users.EmailAlreadyExists", "The email is already registered");
        }

        return HttpResponses.ok(new Response(user.id()));
    }
}
