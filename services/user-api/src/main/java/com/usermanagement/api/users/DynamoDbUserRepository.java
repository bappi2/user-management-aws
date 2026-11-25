package com.usermanagement.api.users;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.CancellationReason;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItem;
import software.amazon.awssdk.services.dynamodb.model.TransactionCanceledException;
import software.amazon.awssdk.services.dynamodb.model.ReturnValuesOnConditionCheckFailure;


/** Evently: Infrastructure/Users/UserRepository.cs, but single-table DynamoDB instead of EF Core. */
public final class DynamoDbUserRepository implements UserRepository {

    private static final String PROFILE = "PROFILE";
    private static final String EMAIL = "EMAIL";

    private final DynamoDbClient dynamo;
    private final String tableName;

    public DynamoDbUserRepository(DynamoDbClient dynamo, String tableName) {
        this.dynamo = dynamo;
        this.tableName = tableName;
    }
    @Override
    public boolean insert(User user) {
        String now = Instant.now().toString();
        try {
            dynamo.putItem(request -> request
                    .tableName(tableName)
                    .item(Map.of(
                            "pk", s(userPk(user.id())),
                            "sk", s(PROFILE),
                            "type", s("User"),
                            "id", s(user.id()),
                            "email", s(user.email()),
                            "firstName", s(user.firstName()),
                            "lastName", s(user.lastName()),
                            "tier", s(user.tier().name()),
                            "createdAt", s(now),
                            "updatedAt", s(now)))
                    .conditionExpression("attribute_not_exists(pk)"));
            return true;
        } catch (ConditionalCheckFailedException e) {
            return false; // already exists → idempotent
        }
    }

/*
    @Override
    public boolean insert(User user) {
        String now = Instant.now().toString();

        Map<String, AttributeValue> profile = Map.of(
                "pk", s(userPk(user.id())),
                "sk", s(PROFILE),
                "type", s("User"),
                "id", s(user.id()),
                "email", s(user.email()),
                "firstName", s(user.firstName()),
                "lastName", s(user.lastName()),
                "createdAt", s(now),
                "updatedAt", s(now));

        Map<String, AttributeValue> emailReservation = Map.of(
                "pk", s(emailPk(user.email())),
                "sk", s(EMAIL),
                "type", s("UserEmail"),
                "userId", s(user.id()),
                "createdAt", s(now));

        try {
            dynamo.transactWriteItems(request -> request.transactItems(
                    TransactWriteItem.builder()
                            .put(put -> put.tableName(tableName)
                                    .item(profile)
                                    .conditionExpression("attribute_not_exists(pk)"))
                            .build(),
                    TransactWriteItem.builder()
                            .put(put -> put.tableName(tableName)
                                    .item(emailReservation)
                                    .conditionExpression("attribute_not_exists(pk)"))
                            .build()));
            return true;
        } catch (TransactionCanceledException e) {
            // cancellationReasons are in the same order as transactItems: [0] profile, [1] email
            List<CancellationReason> reasons = e.cancellationReasons();
            if (reasons.size() > 1 && "ConditionalCheckFailed".equals(reasons.get(1).code())) {
                return false; // email already registered
            }
            throw e; // anything else is unexpected -> 500
        }
    } */

    @Override
    public Optional<User> findById(String id) {
        GetItemResponse response = dynamo.getItem(request -> request
                .tableName(tableName)
                .key(Map.of("pk", s(userPk(id)), "sk", s(PROFILE)))
                .consistentRead(true));

        if (!response.hasItem() || response.item().isEmpty()) {
            return Optional.empty();
        }

        Map<String, AttributeValue> item = response.item();
        AttributeValue tier = item.get("tier");                 // null for profiles created before 4.3
        AttributeValue tutorial = item.get("tutorialVersion");  // null until the user finishes a tutorial

        return Optional.of(new User(
                item.get("id").s(),
                item.get("email").s(),
                item.get("firstName").s(),
                item.get("lastName").s(),
                Tier.fromStored(tier == null ? null : tier.s()),
                tutorial == null ? 0 : Integer.parseInt(tutorial.n())));
    }

    @Override
    public boolean updateName(String id, String firstName, String lastName) {
        try {
            dynamo.updateItem(request -> request
                    .tableName(tableName)
                    .key(Map.of("pk", s(userPk(id)), "sk", s(PROFILE)))
                    .updateExpression("SET firstName = :firstName, lastName = :lastName, updatedAt = :updatedAt")
                    .conditionExpression("attribute_exists(pk)")
                    .expressionAttributeValues(Map.of(
                            ":firstName", s(firstName),
                            ":lastName", s(lastName),
                            ":updatedAt", s(Instant.now().toString()))));
            return true;
        } catch (ConditionalCheckFailedException e) {
            return false; // no such user
        }
    }
    @Override
    public boolean raiseTutorialVersion(String id, int version) {
        try {
            dynamo.updateItem(request -> request
                    .tableName(tableName)
                    .key(Map.of("pk", s(userPk(id)), "sk", s(PROFILE)))
                    .updateExpression("SET tutorialVersion = :v, updatedAt = :updatedAt")
                    .conditionExpression("attribute_exists(pk) AND "
                            + "(attribute_not_exists(tutorialVersion) OR tutorialVersion < :v)")
                    .expressionAttributeValues(Map.of(
                            ":v", AttributeValue.fromN(Integer.toString(version)),
                            ":updatedAt", s(Instant.now().toString())))
                    .returnValuesOnConditionCheckFailure(ReturnValuesOnConditionCheckFailure.ALL_OLD));
            return true;
        } catch (ConditionalCheckFailedException e) {
            // Condition failed for one of two reasons; the returned old item tells which:
            // item present → stored version already >= requested (no-op); no item → user doesn't exist
            return e.hasItem() && !e.item().isEmpty();
        }
    }


    static String userPk(String id) {
        return "USER#" + id;
    }

    static String emailPk(String email) {
        return "EMAIL#" + email;
    }

    private static AttributeValue s(String value) {
        return AttributeValue.fromS(value);
    }
}
