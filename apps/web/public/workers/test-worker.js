// Minimal test worker to verify worker functionality
console.log('🔧 Test worker loaded');

self.onmessage = function(event) {
  console.log('🔧 Test worker received message:', event.data);
  
  try {
    const { type } = event.data;
    
    if (type === 'TEST') {
      self.postMessage({
        type: 'TEST_RESPONSE',
        data: {
          message: 'Test worker is working!',
          timestamp: Date.now()
        }
      });
    } else {
      self.postMessage({
        type: 'ERROR',
        error: 'Unknown message type: ' + type
      });
    }
  } catch (error) {
    console.error('❌ Test worker error:', error);
    self.postMessage({
      type: 'ERROR',
      error: error.message
    });
  }
}; 