#!/bin/bash

# 🚀 Simple Trading System Deployment Script
echo "🚀 Deploying Trading System..."

# Deploy to AWS using SAM
echo "📤 Deploying to AWS..."
sam build
sam deploy --guided

# Test the Lambda function
echo "🧪 Testing Lambda function..."
aws lambda invoke \
    --function-name trading-system-engine \
    --payload '{"test": true}' \
    response.json

echo "✅ Lambda response:"
cat response.json
rm response.json

# Get DynamoDB table name
TABLE_NAME=$(aws cloudformation describe-stacks \
    --stack-name sam-app \
    --query 'Stacks[0].Outputs[?OutputKey==`DynamoDBTable`].OutputValue' \
    --output text)

echo "📊 DynamoDB Table: $TABLE_NAME"

# Create a test signal to verify DynamoDB is working
echo "💾 Creating test signal in DynamoDB..."
aws dynamodb put-item \
    --table-name $TABLE_NAME \
    --item '{
        "symbol": {"S": "AAPL"},
        "timestamp": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"},
        "signal_type": {"S": "BUY"},
        "confidence": {"N": "85.5"},
        "price": {"N": "175.50"},
        "reasons": {"L": [{"S": "Test deployment signal"}]},
        "ttl": {"N": "'$(($(date +%s) + 86400))'"}
    }'

echo "✅ Test signal created!"

# Check if signals exist in DynamoDB
echo "🔍 Checking DynamoDB for signals..."
aws dynamodb scan --table-name $TABLE_NAME --max-items 5

echo "🎉 Deployment complete!"
echo "📊 Check your AWS console for the Lambda function and DynamoDB table"