package com.usermanagement.api.users;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.CognitoUserPoolPostConfirmationEvent;
import com.amazonaws.services.lambda.runtime.logging.LogLevel;
import com.usermanagement.api.AwsClients;
import java.util.Locale;
import java.util.Map;
import org.crac.Core;
import org.crac.Resource;

/**
 * Cognito PostConfirmation trigger: creates the DynamoDB profile once the user has confirmed sign-up.
 * Evently: RegisterUserCommandHandler (the part after the identity provider call).
 */
public class PostConfirmationHandler
        implements RequestHandler<CognitoUserPoolPostConfirmationEvent, CognitoUserPoolPostConfirmationEvent>, Resource {

    static final String CONFIRM_SIGN_UP = "PostConfirmation_ConfirmSignUp";

    private final UserRepository users;

    /** Called by the Lambda runtime once per cold start. */
    public PostConfirmationHandler() {
        this(new DynamoDbUserRepository(AwsClients.dynamoDb(), AwsClients.requireEnv("TABLE_NAME")));
        Core.getGlobalContext().register(this);
    }

    public PostConfirmationHandler(UserRepository users) {
        this.users = users;
    }

    @Override
    public CognitoUserPoolPostConfirmationEvent handleRequest(CognitoUserPoolPostConfirmationEvent event, Context context) {
        if (!CONFIRM_SIGN_UP.equals(event.getTriggerSource())) {
            return event; // e.g. PostConfirmation_ConfirmForgotPassword: not a new user
        }

        Map<String, String> attributes = event.getRequest().getUserAttributes();
        User user = new User(
                attributes.get("sub"),
                attributes.get("email").toLowerCase(Locale.ROOT),
                attributes.get("given_name"),
                attributes.get("family_name"));

        boolean created = users.insert(user);
        log(context, "PostConfirmation sub=" + user.id() + (created ? " profile created" : " profile already existed"));

        return event; // Cognito requires the event to be returned
    }

    /** SnapStart: read-only priming (runs once per snapshot, possibly several times). */
    @Override
    public void beforeCheckpoint(org.crac.Context<? extends Resource> crac) {
        users.findById("snapstart-priming");
    }

    @Override
    public void afterRestore(org.crac.Context<? extends Resource> crac) {
    }

    private static void log(Context context, String message) {
        if (context != null) {
            context.getLogger().log(message, LogLevel.INFO);
        } else {
            System.out.println(message);
        }
    }
}
