package com.usermanagement.api.users;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.usermanagement.api.Endpoint;
import com.usermanagement.api.http.ApiException;
import com.usermanagement.api.http.HttpResponses;
import com.usermanagement.api.http.Json;
import com.usermanagement.api.http.RequestIdentity;
import com.usermanagement.api.http.Validation;

/** The user finished (or skipped) tutorial N. Only moves upwards; repeating or going lower is a no-op. */
public final class UpdateTutorialProgress implements Endpoint {

    public record Request(Integer version) {}

    private final UserRepository users;

    public UpdateTutorialProgress(UserRepository users) {
        this.users = users;
    }

    @Override
    public String routeKey() {
        return "PUT /v1/users/me/tutorial";
    }

    @Override
    public APIGatewayProxyResponseEvent handle(APIGatewayProxyRequestEvent event) {
        String userId = RequestIdentity.requireUserId(event);

        Request request = Json.read(event.getBody(), Request.class);
        new Validation().atLeast("Version", request.version(), 1).throwIfInvalid();

        if (!users.raiseTutorialVersion(userId, request.version())) {
            throw ApiException.notFound("Users.NotFound", "The user with the identifier " + userId + " not found");
        }
        return HttpResponses.noContent();
    }
}
