#!/usr/bin/env bash
# Writes apps/web/.env.local from the CloudFormation outputs of a stage's stack.
# Usage: scripts/env-from-stack.sh [beta|prod]
set -euo pipefail

STAGE="${1:-beta}"
STACK="UserManagement-${STAGE}"
REGION="${AWS_REGION:-$(aws configure get region)}"

output() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

cat > "$(dirname "$0")/../.env.local" <<EOF
# Generated from $STACK by scripts/env-from-stack.sh. Do not commit (ignored via *.local).
VITE_STAGE=$STAGE
VITE_AWS_REGION=$REGION
VITE_API_URL=$(output ApiUrl)
VITE_USER_POOL_ID=$(output UserPoolId)
VITE_USER_POOL_CLIENT_ID=$(output UserPoolClientId)
EOF

echo "Wrote .env.local for $STACK"
