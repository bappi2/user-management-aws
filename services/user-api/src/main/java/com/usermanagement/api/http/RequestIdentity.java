package com.usermanagement.api.http;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import java.util.Map;

public final class RequestIdentity {

    private RequestIdentity() {}

    /** Evently: claims.GetUserId(). Claims are filled by the Cognito authorizer (later phase). */
    public static String requireUserId(APIGatewayProxyRequestEvent event) {
        var ctx = event.getRequestContext();
        if (ctx != null
                && ctx.getAuthorizer() != null
                && ctx.getAuthorizer().get("claims") instanceof Map<?, ?> claims
                && claims.get("sub") instanceof String sub
                && !sub.isBlank()) {
            return sub;
        }
        throw ApiException.unauthorized();
    }
}
