import json
import boto3
import os
from datetime import datetime, timedelta
import urllib.request
import urllib.parse
import ssl

def lambda_handler(event, context):
    print('🚀 Trading Engine Lambda started - ALWAYS SCANNING MODE')
    
    try:
        # Initialize AWS services
        dynamodb = boto3.resource('dynamodb')
        sns = boto3.client('sns')
        
        # Get environment variables
        signals_table_name = os.environ.get('SIGNALS_TABLE', 'trading-system-signals')
        sns_topic_arn = os.environ.get('SNS_TOPIC_ARN')
        
        signals_table = dynamodb.Table(signals_table_name)
        
        # Always scan for opportunities
        print('📊 Scanning market for opportunities (24/7 mode)')
        
        # REAL market scan with actual data
        signals = scan_real_market()
        
        print(f'📊 Found {len(signals)} trading signals')
        
        # Always store signals (whether market is open or not)
        stored_signals = 0
        for signal in signals:
            # Add market execution flag
            signal['execution_status'] = 'queued' if not is_market_open() else 'ready'
            signal['market_open_at_creation'] = is_market_open()
            
            if store_signal_in_dynamodb(signals_table, signal):
                stored_signals += 1
        
        # Send notifications for high-confidence signals
        high_confidence_signals = [s for s in signals if s.get('confidence', 0) >= 80]
        
        print(f'🎯 High confidence signals: {len(high_confidence_signals)}')
        
        notifications_sent = 0
        if high_confidence_signals and sns_topic_arn:
            if send_trading_notifications(sns, sns_topic_arn, high_confidence_signals):
                notifications_sent = 1
        
        # Check market status for response
        market_status = 'open' if is_market_open() else 'closed'
        execution_mode = 'immediate' if is_market_open() else 'queued'
        
        result = {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'scanning_mode': 'always_active',
                'signals_found': len(signals),
                'signals_stored': stored_signals,
                'high_confidence_signals': len(high_confidence_signals),
                'notifications_sent': notifications_sent,
                'timestamp': datetime.now().isoformat(),
                'market_status': market_status,
                'execution_mode': execution_mode,
                'message': f'Found {len(signals)} signals - {"ready for execution" if is_market_open() else "queued for market open"}'
            })
        }
        
        print(f'✅ Scan completed - {execution_mode} mode')
        return result
        
    except Exception as e:
        print(f'❌ Error in lambda handler: {str(e)}')
        return {
            'statusCode': 500,
            'body': json.dumps({
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
        }

def is_market_open():
    """Check if market is open (9 AM - 4 PM EST weekdays)"""
    from datetime import datetime
    import pytz
    
    try:
        # Get current time in Eastern timezone
        eastern = pytz.timezone('US/Eastern')
        current_time = datetime.now(eastern)
        
        # Check if it's a weekday
        if current_time.weekday() >= 5:  # Saturday = 5, Sunday = 6
            return False
        
        # Market hours: 9:30 AM - 4:00 PM ET
        market_open = current_time.replace(hour=9, minute=30, second=0, microsecond=0)
        market_close = current_time.replace(hour=16, minute=0, second=0, microsecond=0)
        
        return market_open <= current_time <= market_close
        
    except:
        # If timezone detection fails, assume market is closed for safety
        return False

def get_real_stock_data(symbol):
    """Get REAL stock data from Yahoo Finance API"""
    try:
        # Yahoo Finance API endpoint
        url = f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=30d'
        
        # Create SSL context
        context = ssl.create_default_context()
        
        # Make request
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        with urllib.request.urlopen(req, context=context) as response:
            data = json.loads(response.read().decode())
        
        # Extract price data
        result = data['chart']['result'][0]
        timestamps = result['timestamp']
        quotes = result['indicators']['quote'][0]
        
        if not timestamps or not quotes['close']:
            return None
        
        # Get last 20 days of data
        prices = []
        for i in range(max(0, len(quotes['close']) - 20), len(quotes['close'])):
            if quotes['close'][i] is not None:
                prices.append({
                    'close': quotes['close'][i],
                    'volume': quotes['volume'][i] if quotes['volume'][i] else 1000000,
                    'high': quotes['high'][i] if quotes['high'][i] else quotes['close'][i],
                    'low': quotes['low'][i] if quotes['low'][i] else quotes['close'][i]
                })
        
        return prices
        
    except Exception as e:
        print(f'Error fetching data for {symbol}: {e}')
        return None

def calculate_rsi(prices, period=14):
    """Calculate RSI indicator"""
    if len(prices) < period + 1:
        return 50  # Default neutral RSI
    
    closes = [p['close'] for p in prices]
    deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
    
    gains = [d if d > 0 else 0 for d in deltas]
    losses = [-d if d < 0 else 0 for d in deltas]
    
    if len(gains) < period:
        return 50
    
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    
    if avg_loss == 0:
        return 100
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    
    return rsi

def analyze_real_stock(symbol, data):
    """Analyze REAL stock data for trading signals"""
    try:
        if not data or len(data) < 10:
            return None
        
        latest = data[-1]
        
        # Calculate technical indicators
        sma_20 = sum([p['close'] for p in data[-20:]]) / min(20, len(data))
        rsi = calculate_rsi(data)
        avg_volume = sum([p['volume'] for p in data[-10:]]) / min(10, len(data))
        volume_ratio = latest['volume'] / avg_volume if avg_volume > 0 else 1
        
        # Calculate price momentum
        if len(data) >= 5:
            price_change_5d = ((latest['close'] - data[-6]['close']) / data[-6]['close']) * 100
        else:
            price_change_5d = 0
        
        # Signal scoring based on REAL analysis
        signal_score = 0
        reasons = []
        
        # Trend analysis
        if latest['close'] > sma_20:
            signal_score += 25
            reasons.append(f'Price above 20-day average (${sma_20:.2f})')
        else:
            signal_score -= 15
            reasons.append(f'Price below 20-day average (${sma_20:.2f})')
        
        # RSI analysis
        if rsi < 30:
            signal_score += 35
            reasons.append(f'Oversold conditions (RSI: {rsi:.1f})')
        elif rsi > 70:
            signal_score -= 35
            reasons.append(f'Overbought conditions (RSI: {rsi:.1f})')
        elif 40 <= rsi <= 60:
            signal_score += 10
            reasons.append(f'RSI in neutral zone ({rsi:.1f})')
        
        # Volume analysis
        if volume_ratio > 1.5:
            signal_score += 20
            reasons.append(f'High volume confirmation ({volume_ratio:.1f}x average)')
        
        # Price momentum
        if abs(price_change_5d) > 3:
            if price_change_5d > 0:
                signal_score += 15
                reasons.append(f'Strong upward momentum (+{price_change_5d:.1f}%)')
            else:
                signal_score -= 15
                reasons.append(f'Strong downward momentum ({price_change_5d:.1f}%)')
        
        # Must have minimum score
        if abs(signal_score) < 40:
            return None
        
        # Calculate confidence
        confidence = min(95, abs(signal_score) * 1.2)
        
        # Determine signal type
        signal_type = 'BUY' if signal_score > 0 else 'SELL'
        
        signal = {
            'symbol': symbol,
            'signal_type': signal_type,
            'confidence': round(confidence, 1),
            'price': round(latest['close'], 2),
            'timestamp': datetime.now().isoformat(),
            'reasons': reasons[:4],
            'technical_data': {
                'rsi': round(rsi, 1),
                'volume_ratio': round(volume_ratio, 2),
                'price_change_5d': round(price_change_5d, 2),
                'sma_20': round(sma_20, 2)
            },
            'ttl': int((datetime.now() + timedelta(days=7)).timestamp())
        }
        
        return signal
        
    except Exception as e:
        print(f'Error analyzing {symbol}: {e}')
        return None

def scan_real_market():
    """Scan REAL market for trading opportunities"""
    symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'SPY', 'QQQ']
    signals = []
    
    for symbol in symbols:
        try:
            print(f'📈 Analyzing REAL data for {symbol}...')
            
            # Get REAL stock data
            data = get_real_stock_data(symbol)
            
            if not data:
                print(f'⚠️ No data for {symbol}')
                continue
            
            # Analyze for REAL signals
            signal = analyze_real_stock(symbol, data)
            
            if signal:
                signals.append(signal)
                print(f'🎯 Signal: {symbol} {signal["signal_type"]} at {signal["confidence"]:.1f}% confidence')
            
        except Exception as e:
            print(f'❌ Error with {symbol}: {e}')
            continue
    
    return signals

def store_signal_in_dynamodb(table, signal):
    """Store signal in DynamoDB"""
    try:
        table.put_item(Item=signal)
        print(f'💾 Stored signal for {signal["symbol"]}')
        return True
    except Exception as e:
        print(f'❌ Error storing signal: {e}')
        return False

def send_trading_notifications(sns_client, topic_arn, signals):
    """Send email notifications for high-confidence signals"""
    try:
        if not signals:
            return False
        
        market_open = is_market_open()
        execution_status = "READY FOR EXECUTION" if market_open else "QUEUED FOR MARKET OPEN"
        
        message = f'🚨 HIGH CONFIDENCE TRADING SIGNALS - {execution_status} 🚨\n\n'
        
        for i, signal in enumerate(signals[:3], 1):
            message += f'{i}. {signal["symbol"]} - {signal["signal_type"]}\n'
            message += f'   💰 Current Price: ${signal["price"]}\n'
            message += f'   🎯 Confidence: {signal["confidence"]}%\n'
            message += f'   📊 RSI: {signal["technical_data"]["rsi"]}\n'
            message += f'   📈 5-Day Change: {signal["technical_data"]["price_change_5d"]:+.1f}%\n'
            message += f'   🔍 Key Reason: {signal["reasons"][0]}\n\n'
        
        message += f'⏰ Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}\n'
        message += f'📊 Market Status: {"OPEN - Execute immediately" if market_open else "CLOSED - Signals queued"}\n'
        message += '🚀 Your trading system is always scanning for opportunities!'
        
        response = sns_client.publish(
            TopicArn=topic_arn,
            Message=message,
            Subject=f'🎯 {len(signals)} Trading Signals - {execution_status}!'
        )
        
        print(f'📱 Notification sent - {execution_status}')
        return True
        
    except Exception as e:
        print(f'❌ Error sending notification: {e}')
        return False

print('🚀 Enhanced Trading Engine - Always Scanning, Smart Execution!')