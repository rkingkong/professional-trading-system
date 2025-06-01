// AWS SDK Configuration for Trading Dashboard
// Fixed version with correct DynamoDB DocumentClient syntax

// AWS Configuration
const AWS_CONFIG = {
    region: 'us-east-1',
    apiVersion: '2012-08-10',
    tableName: 'trading-system-signals',
    lambdaFunctionName: 'trading-system-engine'
};

// Initialize AWS SDK
let dynamodb = null;
let lambda = null;
let isAWSConfigured = false;

// Initialize AWS services
function initializeAWS() {
    try {
        // Check if AWS SDK is loaded
        if (typeof AWS === 'undefined') {
            console.log('⚠️ AWS SDK not loaded');
            return false;
        }

        // Check for stored credentials
        const accessKey = localStorage.getItem('aws_access_key');
        const secretKey = localStorage.getItem('aws_secret_key');
        
        if (!accessKey || !secretKey) {
            console.log('📡 AWS credentials not configured - using demo mode');
            return false;
        }

        // Configure AWS - FIXED VERSION
        AWS.config.update({
            region: AWS_CONFIG.region,
            accessKeyId: accessKey,
            secretAccessKey: secretKey
        });

        // Initialize services with correct syntax
        dynamodb = new AWS.DynamoDB({region: AWS_CONFIG.region});
        lambda = new AWS.Lambda({region: AWS_CONFIG.region});
        
        isAWSConfigured = true;
        console.log('✅ AWS SDK initialized successfully');
        
        // Update UI status indicators
        updateAWSStatusIndicators(true);
        
        return true;
    } catch (error) {
        console.error('❌ AWS initialization failed:', error);
        updateAWSStatusIndicators(false);
        return false;
    }
}

// Update AWS status indicators in the UI
function updateAWSStatusIndicators(connected) {
    const dataStatus = document.getElementById('data-status');
    const engineStatus = document.getElementById('engine-status');
    const notificationStatus = document.getElementById('notification-status');
    
    if (connected) {
        dataStatus.textContent = 'LIVE';
        dataStatus.className = 'status connected';
        engineStatus.textContent = 'LIVE';
        engineStatus.className = 'status connected';
        notificationStatus.textContent = 'LIVE';
        notificationStatus.className = 'status connected';
    } else {
        dataStatus.textContent = 'DEMO';
        dataStatus.className = 'status demo';
        engineStatus.textContent = 'DEMO';
        engineStatus.className = 'status demo';
        notificationStatus.textContent = 'DEMO';
        notificationStatus.className = 'status demo';
    }
}

// Load REAL trading signals from DynamoDB - FIXED VERSION
async function loadRealSignalsFromAWS() {
    try {
        console.log('🔍 Loading REAL signals from DynamoDB...');
        
        if (!isAWSConfigured || !dynamodb) {
            console.log('📡 AWS not configured, using demo signals');
            return await getEnhancedMockSignals();
        }

        // Fixed DynamoDB scan parameters
        const params = {
            TableName: AWS_CONFIG.tableName,
            Limit: 20
        };

        // Use promise() method correctly
        const result = await new Promise((resolve, reject) => {
            dynamodb.scan(params, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
        
        console.log(`📊 Found ${result.Items.length} items in DynamoDB table`);
        
        if (result.Items.length === 0) {
            console.log('📭 No signals in DynamoDB yet - showing system status');
            
            // Show system status when table is empty
            return [{
                symbol: 'SYSTEM',
                signal_type: 'STATUS',
                confidence: 100,
                price: 0,
                timestamp: new Date().toISOString(),
                reasons: [
                    '✅ Connected to AWS successfully!',
                    '📊 Lambda function runs every 30 minutes during market hours',
                    '🎯 No signals found yet - system is selective',
                    '⏰ Signals will appear when market opportunities arise'
                ],
                technical_data: {
                    rsi: 0,
                    volume_ratio: 0,
                    price_change_5d: 0,
                    sma_20: 0
                }
            }];
        }

        // Convert DynamoDB items to our format
        const signals = result.Items.map(item => {
            // Convert DynamoDB format to JavaScript objects
            const convertDynamoDBItem = (dbItem) => {
                const converted = {};
                for (const [key, value] of Object.entries(dbItem)) {
                    if (value.S) converted[key] = value.S;
                    else if (value.N) converted[key] = parseFloat(value.N);
                    else if (value.L) converted[key] = value.L.map(v => v.S || parseFloat(v.N));
                    else if (value.M) converted[key] = convertDynamoDBItem(value.M);
                }
                return converted;
            };
            
            return convertDynamoDBItem(item);
        });

        // Sort by timestamp (newest first)
        signals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Filter out old signals (older than 7 days)
        const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentSignals = signals.filter(signal => 
            new Date(signal.timestamp) > cutoffTime
        );

        console.log(`🎯 ${recentSignals.length} recent signals (last 7 days)`);
        
        return recentSignals.length > 0 ? recentSignals : [{
            symbol: 'INFO',
            signal_type: 'STATUS',
            confidence: 100,
            price: 0,
            timestamp: new Date().toISOString(),
            reasons: [
                '📊 Connected to AWS - no recent trading signals found',
                '🔍 System scanned market but no opportunities met criteria',
                '⚡ This is normal - the system is selective',
                '📈 Signals will appear during volatile market conditions'
            ],
            technical_data: {
                rsi: 50,
                volume_ratio: 1,
                price_change_5d: 0,
                sma_20: 0
            }
        }];

    } catch (error) {
        console.error('❌ Error loading real signals:', error);
        console.log('📡 Falling back to demo signals');
        return await getEnhancedMockSignals();
    }
}

// Enhanced mock signals for demo mode
async function getEnhancedMockSignals() {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [{
        symbol: 'SYSTEM',
        signal_type: 'STATUS',
        confidence: 100,
        price: 0,
        timestamp: new Date().toISOString(),
        reasons: [
            '📡 Demo mode - connect to AWS for live data',
            '⚙️ Click "System Config" to enter AWS credentials',
            '🔄 System ready to connect to real trading signals',
            '📊 Lambda function and DynamoDB configured'
        ],
        technical_data: {
            rsi: 0,
            volume_ratio: 0,
            price_change_5d: 0,
            sma_20: 0
        }
    }];
}

// Trigger manual market scan via Lambda - FIXED VERSION
async function triggerManualScan() {
    try {
        console.log('🚀 Triggering manual market scan...');
        
        if (!isAWSConfigured || !lambda) {
            console.log('📡 AWS not configured - simulating manual scan');
            return simulateManualScan();
        }

        const params = {
            FunctionName: AWS_CONFIG.lambdaFunctionName,
            InvocationType: 'Event',
            Payload: JSON.stringify({
                manual_trigger: true,
                trigger_source: 'dashboard',
                timestamp: new Date().toISOString()
            })
        };

        // Use callback version
        const result = await new Promise((resolve, reject) => {
            lambda.invoke(params, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
        
        console.log('✅ Manual scan triggered successfully');
        showNotification('🚀 Manual scan initiated! Check back in 2-3 minutes for new signals.', 'success');
        
        // Auto-refresh after 3 minutes
        setTimeout(() => {
            if (typeof loadSignals === 'function') {
                loadSignals();
            }
        }, 180000);
        
        return true;

    } catch (error) {
        console.error('❌ Error triggering manual scan:', error);
        showNotification('❌ Manual scan failed. Check AWS credentials.', 'warning');
        return simulateManualScan();
    }
}

// Simulate manual scan for demo mode
function simulateManualScan() {
    showNotification('🎮 Demo scan initiated! Generating fresh signals...', 'info');
    
    setTimeout(() => {
        if (typeof loadSignals === 'function') {
            loadSignals();
        }
        showNotification('✅ Demo scan complete! New signals generated.', 'success');
    }, 2000);
    
    return true;
}

// Get system statistics from AWS - SIMPLIFIED VERSION
async function getSystemStatistics() {
    try {
        if (!isAWSConfigured || !dynamodb) {
            return {
                totalSignals: '--',
                highConfidence: '--',
                buySignals: '--',
                sellSignals: '--',
                systemHealth: 'DEMO'
            };
        }

        // Simple stats for now
        return {
            totalSignals: 0,
            highConfidence: 0,
            buySignals: 0,
            sellSignals: 0,
            systemHealth: 'LIVE'
        };

    } catch (error) {
        console.error('❌ Error getting system statistics:', error);
        return {
            totalSignals: '--',
            highConfidence: '--',
            buySignals: '--',
            sellSignals: '--',
            systemHealth: 'ERROR'
        };
    }
}

// Enhanced load signals function that uses real AWS data
async function loadSignalsEnhanced() {
    if (typeof isLoading !== 'undefined' && isLoading) return;
    
    if (typeof isLoading !== 'undefined') {
        isLoading = true;
    }
    
    if (typeof showLoading === 'function') {
        showLoading(true);
    }
    
    try {
        console.log('🔄 Loading enhanced signals...');
        
        // Load both signals and statistics
        const [signalData, stats] = await Promise.all([
            loadRealSignalsFromAWS(),
            getSystemStatistics()
        ]);
        
        // Display signals
        if (typeof displaySignals === 'function') {
            displaySignals(signalData);
        }
        
        // Update statistics with real data
        updateStatisticsEnhanced(stats);
        
        console.log('✅ Enhanced signal loading completed');
        
    } catch (error) {
        console.error('❌ Error in enhanced loading:', error);
        if (typeof showError === 'function') {
            showError('Failed to load signals. Running in demo mode.');
        }
        
        // Fallback to demo signals
        const demoSignals = await getEnhancedMockSignals();
        if (typeof displaySignals === 'function') {
            displaySignals(demoSignals);
        }
        if (typeof updateStatistics === 'function') {
            updateStatistics(demoSignals);
        }
    } finally {
        if (typeof isLoading !== 'undefined') {
            isLoading = false;
        }
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
    }
}

// Enhanced statistics update with real AWS data
function updateStatisticsEnhanced(stats) {
    const elements = {
        'total-signals': stats.totalSignals,
        'high-confidence': stats.highConfidence,
        'buy-signals': stats.buySignals,
        'sell-signals': stats.sellSignals,
        'last-update': new Date().toLocaleTimeString()
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Update system status
    const systemStatus = document.getElementById('system-status');
    if (systemStatus) {
        systemStatus.textContent = stats.systemHealth;
        systemStatus.className = `status ${stats.systemHealth.toLowerCase() === 'live' ? 'open' : 'demo'}`;
    }
}

// Enhanced manual scan function
async function manualScanEnhanced() {
    const button = event.target;
    const originalText = button.innerHTML;
    
    // Show loading state
    button.innerHTML = '<span>⏳</span> Scanning...';
    button.disabled = true;
    
    try {
        const success = await triggerManualScan();
        
        if (success) {
            button.innerHTML = '<span>✅</span> Scan Started';
            
            // Reset button after 5 seconds
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 5000);
        } else {
            throw new Error('Manual scan failed');
        }
        
    } catch (error) {
        button.innerHTML = '<span>❌</span> Scan Failed';
        
        // Reset button after 3 seconds
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 3000);
    }
}

// Show notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// AWS Credentials Management
function configureAWSCredentials() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div style="background: #1a1f2e; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%;">
                <h3 style="margin-bottom: 20px; color: #ffffff;">🔗 AWS Configuration</h3>
                <p style="margin-bottom: 20px; color: #9ca3af;">Enter your AWS credentials to connect to live trading data:</p>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #ffffff;">Access Key ID:</label>
                    <input type="text" id="aws-access-key-input" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #374151; background: #111827; color: #ffffff;">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #ffffff;">Secret Access Key:</label>
                    <input type="password" id="aws-secret-key-input" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #374151; background: #111827; color: #ffffff;">
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="saveAWSCredentials()" style="flex: 1; background: #10b981; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">Save & Connect</button>
                    <button onclick="this.closest('div').remove()" style="flex: 1; background: #374151; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function saveAWSCredentials() {
    const accessKey = document.getElementById('aws-access-key-input').value.trim();
    const secretKey = document.getElementById('aws-secret-key-input').value.trim();
    
    if (!accessKey || !secretKey) {
        alert('Please enter both Access Key ID and Secret Access Key');
        return;
    }
    
    // Store credentials
    localStorage.setItem('aws_access_key', accessKey);
    localStorage.setItem('aws_secret_key', secretKey);
    
    // Initialize AWS with new credentials
    const success = initializeAWS();
    
    if (success) {
        showNotification('✅ AWS credentials saved! Connecting to live data...', 'success');
        
        // Reload signals with real AWS data
        setTimeout(() => {
            if (typeof loadSignals === 'function') {
                loadSignals();
            }
        }, 1000);
    } else {
        showNotification('❌ Failed to connect to AWS. Please check your credentials.', 'error');
    }
    
    // Close modal
    document.querySelector('[style*="position: fixed"]').remove();
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing AWS Trading Dashboard...');
    
    // Try to initialize AWS
    const awsInitialized = initializeAWS();
    
    if (awsInitialized) {
        console.log('📡 Using REAL AWS data');
        
        // Replace original functions with enhanced versions
        if (typeof window !== 'undefined') {
            window.loadSignals = loadSignalsEnhanced;
            window.manualScan = manualScanEnhanced;
            window.configureSystem = configureAWSCredentials;
        }
        
        showNotification('🟢 Connected to live AWS data!', 'success');
        
    } else {
        console.log('📱 Using demo mode (AWS not configured)');
        showNotification('ℹ️ Running in demo mode. Click "System Config" to connect to AWS.', 'info');
        
        // Still replace some functions for better demo experience
        if (typeof window !== 'undefined') {
            window.configureSystem = configureAWSCredentials;
            window.manualScan = function() {
                manualScanEnhanced();
            };
        }
    }
});

console.log('🚀 Fixed AWS Connection Script loaded and ready!');