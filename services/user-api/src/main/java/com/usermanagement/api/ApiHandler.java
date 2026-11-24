package com.usermanagement.api;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.usermanagement.api.http.ApiException;
import com.usermanagement.api.http.HttpResponses;
import com.usermanagement.api.http.Json;
import com.usermanagement.api.users.GetUserProfile;
import com.usermanagement.api.users.GetMe;
import com.usermanagement.api.users.GetProDemo;
import com.usermanagement.api.users.UpdateUserProfile;
import com.usermanagement.api.users.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.usermanagement.api.users.DynamoDbUserRepository;
import com.amazonaws.services.lambda.runtime.logging.LogLevel;
import org.crac.Core;
import org.crac.Resource;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Set;




/** Lambda entry point. Evently: endpoint mapping (MapEndpoints) + global exception handler. */
//public class ApiHandler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {
public class ApiHandler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent>, Resource {

    private final Map<String, Endpoint> routes;
    private final Set<String> allowedOrigins;

    /** Called by the Lambda runtime once per cold start. */
    public ApiHandler() {
        this(new DynamoDbUserRepository(AwsClients.dynamoDb(), AwsClients.requireEnv("TABLE_NAME")),
                parseOrigins(System.getenv("ALLOWED_ORIGINS")));
        Core.getGlobalContext().register(this);
    }

    /** Tests: no CORS origins. */
    public ApiHandler(UserRepository users) {
        this(users, Set.of());
    }

    ApiHandler(UserRepository users, Set<String> allowedOrigins) {
        List<Endpoint> endpoints = List.of(
                new GetUserProfile(users),
                new UpdateUserProfile(users),
                new GetMe(users),
                new GetProDemo(users));
        this.routes = endpoints.stream()
                .collect(Collectors.toUnmodifiableMap(Endpoint::routeKey, endpoint -> endpoint));
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent event, Context context) {
        return withCors(event, route(event, context));
    }


    private APIGatewayProxyResponseEvent route(APIGatewayProxyRequestEvent event, Context context) {
        String routeKey = event.getHttpMethod() + " " + event.getResource();
        String requestId = event.getRequestContext() != null ? event.getRequestContext().getRequestId() : null;
        //System.out.println(Json.write(Map.of("routeKey", routeKey, "requestId", String.valueOf(requestId))));
        //log(context, Json.write(Map.of("routeKey", routeKey, "requestId", String.valueOf(requestId))));
        log(context, LogLevel.INFO, Json.write(Map.of("routeKey", routeKey, "requestId", String.valueOf(requestId))));


        Endpoint endpoint = routes.get(routeKey);
        if (endpoint == null) {
            return HttpResponses.problem(ApiException.notFound("Route.NotFound", "No handler for " + routeKey));
        }

        try {
            return endpoint.handle(event);
        } catch (ApiException e) {
            return HttpResponses.problem(e);
        //} catch (RuntimeException e) {
        //    e.printStackTrace(); // real bug: full stack trace to CloudWatch
        //    return HttpResponses.problem(new ApiException(500, "Server.Error", "Unexpected error", null));
        //}
        } catch (RuntimeException e) {
            var trace = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(trace));
            //log(context, "Unhandled error for " + routeKey + "\n" + trace);
            log(context, LogLevel.ERROR, "Unhandled error for " + routeKey + "\n" + trace);

            return HttpResponses.problem(new ApiException(500, "Server.Error", "Unexpected error", null));
        }

    }
        /** SnapStart: runs once before the snapshot. Exercise the hot path so its classes are in the snapshot. */
    @Override
    public void beforeCheckpoint(org.crac.Context<? extends Resource> crac) {
        var priming = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        priming.setRequestId("snapstart-priming");
        priming.setAuthorizer(Map.<String, Object>of("claims", Map.of("sub", "snapstart-priming")));
        handleRequest(new APIGatewayProxyRequestEvent()
                .withHttpMethod("GET")
                .withResource("/v1/users/profile")
                .withRequestContext(priming), null);
    }

    @Override
    public void afterRestore(org.crac.Context<? extends Resource> crac) {
        // nothing to refresh: SDK reconnects, credentials provider refreshes itself
    }

    /** LambdaLogger keeps multi-line messages (stack traces) as ONE CloudWatch event. */
    private static void log(Context context, String message) {
        if (context != null) {
            context.getLogger().log(message + "\n");
        } else {
            System.out.println(message); // unit tests pass a null Context
        }
    }

    private static void log(Context context, LogLevel level, String message) {
        if (context != null) {
            context.getLogger().log(message, level);
        } else {
            System.out.println(message);
        }
    }

    /** Echo the Origin back only if it is allowed for this stage. */
    private APIGatewayProxyResponseEvent withCors(APIGatewayProxyRequestEvent event, APIGatewayProxyResponseEvent response) {
        String origin = header(event, "Origin");
        if (origin != null && allowedOrigins.contains(origin)) {
            var headers = new HashMap<String, String>();
            if (response.getHeaders() != null) {
                headers.putAll(response.getHeaders());
            }
            headers.put("Access-Control-Allow-Origin", origin);
            headers.put("Vary", "Origin");
            response.setHeaders(headers);
        }
        return response;
    }

    /** HTTP header names are case-insensitive; API Gateway keeps the client's casing. */
    private static String header(APIGatewayProxyRequestEvent event, String name) {
        if (event.getHeaders() == null) {
            return null;
        }
        return event.getHeaders().entrySet().stream()
                .filter(entry -> entry.getKey().equalsIgnoreCase(name))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    private static Set<String> parseOrigins(String value) {
        if (value == null || value.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }


}
