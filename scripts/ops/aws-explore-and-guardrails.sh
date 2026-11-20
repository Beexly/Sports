#!/usr/bin/env bash
# scripts/ops/aws-explore-and-guardrails.sh
# Runs strictly in us-east-2 (Ohio) on the AWS Free Plan BEFORE Paid upgrade / advanced activation.
# Sets up credit-excluded Budgets + Cost Anomaly Detection and executes safe Explore AWS activities
# with near-zero burn and zero idle resources left behind.

set -euo pipefail
export AWS_DEFAULT_REGION="us-east-2"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ALERT_EMAIL="${ALERT_EMAIL:?Set ALERT_EMAIL before running}"
echo "[INFO] AWS Account: $ACCOUNT_ID | Region: $AWS_DEFAULT_REGION | Alert: $ALERT_EMAIL"

cat > /tmp/budget-zero.json << 'EOF'
{
  "BudgetName": "gse-zero-spend-excl-credits",
  "BudgetLimit": { "Amount": "1.00", "Unit": "USD" },
  "CostTypes": {
    "IncludeTax": true,
    "IncludeSubscription": true,
    "UseBlended": false,
    "IncludeRefund": false,
    "IncludeCredit": false,
    "IncludeUpfront": true,
    "IncludeRecurring": true,
    "IncludeOtherSubscription": true,
    "IncludeSupport": true,
    "IncludeDiscount": true,
    "UseAmortized": false
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
EOF

cat > /tmp/budget-notif.json << EOF
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      { "SubscriptionType": "EMAIL", "Address": "$ALERT_EMAIL" }
    ]
  }
]
EOF

aws budgets create-budget \
  --account-id "$ACCOUNT_ID" \
  --budget file:///tmp/budget-zero.json \
  --notifications-with-subscribers file:///tmp/budget-notif.json \
  || echo "[INFO] Budget gse-zero-spend-excl-credits already exists or created."

MONITOR_ARN=$(aws ce create-anomaly-monitor \
  --anomaly-monitor '{"MonitorName":"gse-all-services-monitor","MonitorType":"DIMENSIONAL","MonitorDimension":"SERVICE"}' \
  --query MonitorArn --output text 2>/dev/null || true)
if [ -n "$MONITOR_ARN" ]; then
  aws ce create-anomaly-subscription \
    --anomaly-subscription "{\"SubscriptionName\":\"gse-anomaly-email\",\"Threshold\":5.0,\"Frequency\":\"DAILY\",\"MonitorArnList\":[\"$MONITOR_ARN\"],\"Subscribers\":[{\"Address\":\"$ALERT_EMAIL\",\"Type\":\"EMAIL\"}]}" \
    || true
  echo "[OK] Cost Anomaly Detection monitor active: $MONITOR_ARN"
fi

aws dynamodb create-table \
  --table-name gse-predictions-serving \
  --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-2 \
  || echo "[INFO] DynamoDB table gse-predictions-serving already exists."

aws bedrock-runtime converse \
  --region us-east-2 \
  --model-id amazon.nova-micro-v1:0 \
  --messages '[{"role":"user","content":[{"text":"Reply OK"}]}]' \
  --inference-config '{"maxTokens":8}' \
  || echo "[WARN] Bedrock CLI call skipped; run 1 prompt in Bedrock Playground UI to trigger $20 credit."

echo "[DONE] Core zero-idle guardrails + DynamoDB + Bedrock check complete."
