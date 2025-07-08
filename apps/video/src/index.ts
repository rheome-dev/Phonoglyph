import { registerRoot } from 'remotion';
import { RemotionRoot } from './Composition';

registerRoot(RemotionRoot);

// Development hot reload
if (typeof module !== 'undefined' && (module as any).hot) {
  (module as any).hot.accept('./Composition', () => {
    const NextRemotionRoot = require('./Composition').RemotionRoot;
    registerRoot(NextRemotionRoot);
  });
}