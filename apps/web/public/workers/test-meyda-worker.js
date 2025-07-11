// Simple test worker to verify Meyda loading
console.log('🧪 Test worker starting...');

let Meyda = null;

try {
  importScripts('/workers/meyda.min.js');
  Meyda = self.Meyda;
  console.log('✅ Meyda loaded successfully in test worker');
  
  // Test basic Meyda functionality
  if (Meyda && typeof Meyda.extract === 'function') {
    console.log('✅ Meyda.extract function available');
  } else {
    console.warn('⚠️ Meyda.extract function not available');
  }
  
} catch (error) {
  console.error('❌ Failed to load Meyda in test worker:', error);
}

// Send result back
self.postMessage({
  type: 'TEST_RESULT',
  meydaLoaded: !!Meyda,
  meydaExtractAvailable: !!(Meyda && typeof Meyda.extract === 'function'),
  timestamp: Date.now()
});

console.log('🧪 Test worker completed'); 