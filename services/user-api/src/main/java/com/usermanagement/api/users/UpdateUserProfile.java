package com.usermanagement.api.users;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.usermanagement.api.Endpoint;
import com.usermanagement.api.http.ApiException;
import com.usermanagement.api.http.HttpResponses;
import com.usermanagement.api.http.Json;
import com.usermanagement.api.http.RequestIdentity;
import com.usermanagement.api.http.Validation;

/** Evently: Presentation/Users/UpdateUserProfile.cs + UpdateUserCommandValidator + handler. */
public final class UpdateUserProfile implements Endpoint {

    public record Request(String firstName, String lastName) {}

    private final UserRepository users;

    public UpdateUserProfile(UserRepository users) {
        this.users = users;
    }

    @Override
    public String routeKey() {
        return "PUT /v1/users/profile";
    }

    @Override
    public APIGatewayProxyResponseEvent handle(APIGatewayProxyRequestEvent event) {
        String userId = RequestIdentity.requireUserId(event); // auth before reading the body

        Request request = Json.read(event.getBody(), Request.class);
        new Validation()
                .notBlank("FirstName", request.firstName())
                .notBlank("LastName", request.lastName())
                .throwIfInvalid();

        if (!users.updateName(userId, request.firstName().trim(), request.lastName().trim())) {
            throw ApiException.notFound("Users.NotFound", "The user with the identifier " + userId + " not found");
        }

        return HttpResponses.noContent(); // Evently: Results.NoContent
    }
}
