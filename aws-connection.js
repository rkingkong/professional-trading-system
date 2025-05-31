// AWS SDK Configuration for Trading Dashboard
// This script connects your dashboard to real AWS DynamoDB signals

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
            console.log('📡 AWS credentials not configured');
            return false;
        }

        // Configure AWS
        AWS.config.update({
            region: AWS_CONFIG.region,
            accessKeyId: accessKey,
            secretAccessKey: secretKey
        });

        // Initialize services
        dynamodb = new AWS.DynamoDB.DocumentClient();
        lambda = new AWS.Lambda();
        
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
        dataStatus.textContent = 'CONNECTED';
        dataStatus.className = 'status connected';
        engineStatus.textContent = 'CONNECTED';
        engineStatus.className = 'status connected';
        notificationStatus.textContent = 'CONNECTED';
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

// Load REAL trading signals from DynamoDB
async function loadRealSignalsFromAWS() {
    try {
        console.log('🔍 Loading REAL signals from DynamoDB...');
        
        if (!isAWSConfigured || !dynamodb) {
            console.log('📡 AWS not configured, using demo signals');
            return await getEnhancedMockSignals();
        }

        const params = {
            TableName: AWS_CONFIG.tableName,
            FilterExpression: 'attribute_exists(confidence)',
            ScanIndexForward: false,
            Limit: 20
        };

        const result = await dynamodb.scan(params).promise();
        
        console.log(`📊 Found ${result.Items.length} REAL trading signals`);
        
        // Sort by timestamp (newest first)
        const signals = result.Items.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        // Filter out old signals (older than 24 hours)
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentSignals = signals.filter(signal => 
            new Date(signal.timestamp) > cutoffTime
        );

        console.log(`🎯 ${recentSignals.length} recent signals (last 24h)`);
        
        return recentSignals.length > 0 ? recentSignals : await getEnhancedMockSignals();

    } catch (error) {
        console.error('❌ Error loading real signals:', error);
        console.log('📡 Falling back to demo signals');
        return await getEnhancedMockSignals();
    }
}

// Trigger manual market scan via Lambda
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

        const result = await lambda.invoke(params).promise();
        
        console.log('✅ Manual scan triggered successfully');
        showNotification('🚀 Manual scan initiated! Check back in 2-3 minutes for new signals.', 'success');
        
        // Auto-refresh after 3 minutes
        setTimeout(() => {
            loadSignals();
        }, 180000);
        
        return true;

    } catch (error) {
        console.error('❌ Error triggering manual scan:', error);
        showNotification('❌ Manual scan failed. Falling back to demo mode.', 'warning');
        return simulateManualScan();
    }
}

// Simulate manual scan for demo mode
function simulateManualScan() {
    showNotification('🎮 Demo scan initiated! Generating fresh signals...', 'info');
    
    // Simulate scan delay
    setTimeout(() => {
        loadSignals();
        showNotification('✅ Demo scan complete! New signals generated.', 'success');
    }, 2000);
    
    return true;
}

// Get system statistics from AWS
async function getSystemStatistics() {
    try {
        if (!isAWSConfigured || !dynamodb) {
            return {
                totalSignals: 3,
                highConfidence: 2,
                buySignals: 2,
                sellSignals: 1,
                systemHealth: 'DEMO'
            };
        }

        // Get recent signals for statistics
        const params = {
            TableName: AWS_CONFIG.tableName,
            FilterExpression: 'attribute_exists(confidence)',
            Select: 'ALL_ATTRIBUTES'
        };

        const result = await dynamodb.scan(params).promise();
        const signals = result.Items || [];

        // Calculate statistics
        const totalSignals = signals.length;
        const highConfidence = signals.filter(s => s.confidence >= 80).length;
        const buySignals = signals.filter(s => s.signal_type && s.signal_type.includes('BUY')).length;
        const sellSignals = signals.filter(s => s.signal_type && s.signal_type.includes('SELL')).length;

        return {
            totalSignals,
            highConfidence,
            buySignals,
            sellSignals,
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
    if (isLoading) return;
    
    isLoading = true;
    showLoading(true);
    
    try {
        console.log('🔄 Loading enhanced signals...');
        
        // Load both signals and statistics
        const [signalData, stats] = await Promise.all([
            loadRealSignalsFromAWS(),
            getSystemStatistics()
        ]);
        
        // Display signals
        displaySignals(signalData);
        
        // Update statistics with real data
        updateStatisticsEnhanced(stats);
        
        console.log('✅ Enhanced signal loading completed');
        
    } catch (error) {
        console.error('❌ Error in enhanced loading:', error);
        showError('Failed to load signals. Running in demo mode.');
        
        // Fallback to demo signals
        const demoSignals = await getEnhancedMockSignals();
        displaySignals(demoSignals);
        updateStatistics(demoSignals);
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// Enhanced statistics update with real AWS data
function updateStatisticsEnhanced(stats) {
    document.getElementById('total-signals').textContent = stats.totalSignals;
    document.getElementById('high-confidence').textContent = stats.highConfidence;
    document.getElementById('buy-signals').textContent = stats.buySignals;
    document.getElementById('sell-signals').textContent = stats.sellSignals;
    document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
    
    // Update system status
    const systemStatus = document.getElementById('system-status');
    systemStatus.textContent = stats.systemHealth;
    systemStatus.className = `status ${stats.systemHealth.toLowerCase() === 'live' ? 'open' : 'demo'}`;
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
    
    // Add styles if not already added
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 400px;
                padding: 15px 20px;
                border-radius: 10px;
                color: white;
                font-weight: 600;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            
            .notification.success {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }
            
            .notification.error {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            }
            
            .notification.warning {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            }
            
            .notification.info {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            }
            
            .notification-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .notification button {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                margin-left: 15px;
                opacity: 0.8;
            }
            
            .notification button:hover {
                opacity: 1;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
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
    
    // Store credentials securely (in production, use more secure storage)
    localStorage.setItem('aws_access_key', accessKey);
    localStorage.setItem('aws_secret_key', secretKey);
    
    // Initialize AWS with new credentials
    const success = initializeAWS();
    
    if (success) {
        showNotification('✅ AWS credentials saved! Connecting to live data...', 'success');
        
        // Reload signals with real AWS data
        setTimeout(() => {
            loadSignals();
        }, 1000);
    } else {
        showNotification('❌ Failed to connect to AWS. Please check your credentials.', 'error');
    }
    
    // Close modal
    document.querySelector('[style*="position: fixed"]').remove();
}

// Export real data with enhanced format
function exportRealSignals() {
    if (!signals || signals.length === 0) {
        showNotification('📭 No signals to export', 'warning');
        return;
    }
    
    try {
        // Enhanced CSV format with more details
        const header = 'Timestamp,Symbol,Signal Type,Confidence %,Current Price,RSI,Volume Ratio,5-Day Change %,MACD,SMA 20,Signal Score,Key Reasons\n';
        
        const rows = signals.map(signal => {
            const timestamp = new Date(signal.timestamp).toLocaleString();
            const reasons = signal.reasons ? signal.reasons.join('; ') : '';
            const technical = signal.technical_data || {};
            
            return [
                timestamp,
                signal.symbol,
                signal.signal_type,
                signal.confidence,
                signal.price,
                technical.rsi || '',
                technical.volume_ratio || '',
                technical.price_change_5d || '',
                technical.macd || '',
                technical.sma_20 || '',
                technical.signal_score || '',
                `"${reasons}"`
            ].join(',');
        }).join('\n');
        
        const csv = header + rows;
        
        // Create and download file
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `trading_signals_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification(`📊 Exported ${signals.length} signals successfully!`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showNotification('❌ Export failed. Please try again.', 'error');
    }
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
            window.downloadSignals = exportRealSignals;
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
    
    // Load initial data
    if (typeof loadSignals === 'function') {
        loadSignals();
    }
});

// Auto-retry AWS connection
setInterval(() => {
    if (!isAWSConfigured && localStorage.getItem('aws_access_key')) {
        console.log('🔄 Retrying AWS connection...');
        initializeAWS();
    }
}, 30000); // Check every 30 seconds

console.log('🚀 AWS Connection Script loaded and ready!');