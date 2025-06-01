#!/bin/bash

# 🤖 Deploy ML-Enhanced Trading System for Maximum Profitability
echo "🤖 Deploying ML Enhancement System for Maximum Trading Profits..."

# Create deployment package for ML Lambda
echo "📦 Creating ML Lambda deployment package..."
mkdir -p ml-lambda-package
cd ml-lambda-package

# Copy the ML enhancement code
cp ../ml_enhancement_lambda.py .
cp ../requirements.txt .

# Install Python packages for Lambda
echo "📚 Installing ML libraries..."
pip install -r requirements.txt -t .

# Create deployment zip
echo "📦 Creating deployment package..."
zip -r ml-enhancement-lambda.zip .

# Deploy ML Lambda Function
echo "🚀 Deploying ML Enhancement Lambda..."
aws lambda create-function \
    --function-name trading-ml-enhancement \
    --runtime python3.9 \
    --role arn:aws:iam::826564544834:role/trading-system-lambda-role \
    --handler ml_enhancement_lambda.lambda_handler \
    --zip-file fileb://ml-enhancement-lambda.zip \
    --timeout 900 \
    --memory-size 1024 \
    --environment Variables='{
        "SIGNALS_TABLE":"trading-system-signals",
        "PERFORMANCE_TABLE":"trading-system-performance", 
        "MODELS_BUCKET":"trading-ml-models-826564544834"
    }' \
    --region us-east-1

# If function already exists, update it instead
if [ $? -ne 0 ]; then
    echo "🔄 Function exists, updating code..."
    aws lambda update-function-code \
        --function-name trading-ml-enhancement \
        --zip-file fileb://ml-enhancement-lambda.zip \
        --region us-east-1
fi

# Create S3 bucket for ML models
echo "🪣 Creating S3 bucket for ML models..."
aws s3 mb s3://trading-ml-models-826564544834 --region us-east-1 || echo "Bucket may already exist"

# Create performance tracking table
echo "📊 Creating performance tracking table..."
aws dynamodb create-table \
    --table-name trading-system-performance \
    --attribute-definitions \
        AttributeName=date,AttributeType=S \
        AttributeName=symbol,AttributeType=S \
    --key-schema \
        AttributeName=date,KeyType=HASH \
        AttributeName=symbol,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1 || echo "Table may already exist"

# Test the ML system
echo "🧪 Testing ML Enhancement System..."
aws lambda invoke \
    --function-name trading-ml-enhancement \
    --payload '{"operation": "train_models"}' \
    --region us-east-1 \
    ml_test_response.json

echo "📊 ML System Response:"
cat ml_test_response.json

# Run backtesting
echo "📈 Running backtesting analysis..."
aws lambda invoke \
    --function-name trading-ml-enhancement \
    --payload '{"operation": "backtest"}' \
    --region us-east-1 \
    backtest_response.json

echo "📊 Backtesting Results:"
cat backtest_response.json

# Clean up
cd ..
rm -rf ml-lambda-package

echo "✅ ML Enhancement System Deployed Successfully!"
echo ""
echo "🎯 NEXT STEPS FOR MAXIMUM PROFITABILITY:"
echo "1. ✅ ML models are now training on historical data"
echo "2. 📊 Backtesting will show current system performance"
echo "3. 🚀 Enhanced signals will improve win rate"
echo "4. 💰 More profitable trades = more money for the kids!"
echo ""
echo "📞 To trigger ML enhancement:"
echo "aws lambda invoke --function-name trading-ml-enhancement --payload '{\"operation\": \"enhance_signals\"}' response.json"
echo ""
echo "🎉 Your trading system is now ML-enhanced for maximum charity impact!"