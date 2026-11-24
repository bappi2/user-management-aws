package com.usermanagement.api.users;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.usermanagement.api.Endpoint;
import com.usermanagement.api.http.ApiException;
import com.usermanagement.api.http.HttpResponses;
import com.usermanagement.api.http.RequestIdentity;

/** Demo of a tier-gated endpoint. Copy this shape for real PRO features. */
public final class GetProDemo implements Endpoint {

    public record Response(String message) {}

    private final UserRepository users;

    public GetProDemo(UserRepository users) {
        this.users = users;
    }

    @Override
    public String routeKey() {
        return "GET /v1/demo/pro";
    }

    @Override
    public APIGatewayProxyResponseEvent handle(APIGatewayProxyRequestEvent event) {
        String userId = RequestIdentity.requireUserId(event);

        User user = users.findById(userId).orElseThrow(() ->
                ApiException.notFound("Users.NotFound", "The user with the identifier " + userId + " not found"));
        TierCheck.require(user, Tier.PRO);

        return HttpResponses.ok(new Response("Hello " + user.firstName() + ", you have PRO access"));
    }
}
