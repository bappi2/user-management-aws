package com.usermanagement.api;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;

/** Evently: IEndpoint. One implementation per use case. */
public interface Endpoint {

    /** Must match API Gateway "METHOD /resource", e.g. "POST /v1/users/register". */
    String routeKey();

    APIGatewayProxyResponseEvent handle(APIGatewayProxyRequestEvent event);
}
