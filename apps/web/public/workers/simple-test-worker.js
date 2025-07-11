// Simple test worker
console.log('🧪 Simple test worker starting...');

self.onmessage = function(event) {
  console.log('📥 Simple worker received:', event.data);
  
  if (event.data.type === 'PING') {
    console.log('📤 Simple worker sending PONG');
    self.postMessage({
      type: 'PONG',
      data: {
        message: 'Hello from simple worker!',
        timestamp: Date.now()
      }
    });
  }
};

console.log('🧪 Simple test worker ready'); 