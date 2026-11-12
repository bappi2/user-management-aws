package com.usermanagement.api.users;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.usermanagement.api.Endpoint;
import com.usermanagement.api.http.ApiException;
import com.usermanagement.api.http.HttpResponses;
import com.usermanagement.api.http.RequestIdentity;

/** Evently: Presentation/Users/GetUserProfile.cs + GetUserQueryHandler. */
public final class GetUserProfile implements Endpoint {

    /** Evently: UserResponse(Id, Email, FirstName, LastName) */
    public record Response(String id, String email, String firstName, String lastName) {}

    private final UserRepository users;

    public GetUserProfile(UserRepository users) {
        this.users = users;
    }

    @Override
    public String routeKey() {
        return "GET /v1/users/profile";
    }

    @Override
    public APIGatewayProxyResponseEvent handle(APIGatewayProxyRequestEvent event) {
        String userId = RequestIdentity.requireUserId(event);

        User user = users.findById(userId).orElseThrow(() ->
                ApiException.notFound("Users.NotFound", "The user with the identifier " + userId + " not found"));

        return HttpResponses.ok(new Response(user.id(), user.email(), user.firstName(), user.lastName()));
    }
}
