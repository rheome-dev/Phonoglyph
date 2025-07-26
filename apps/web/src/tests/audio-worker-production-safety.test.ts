/**
 * Test Suite: Audio Worker Production Safety
 * Story 8.1: Remove Mock Data Systems in Production
 * 
 * Critical tests to ensure no mock data generation systems exist in production
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Audio Worker Production Safety', () => {
  let workerCode: string;

  beforeAll(() => {
    // Read the actual worker file
    const workerPath = join(process.cwd(), 'public/workers/audio-analysis-worker.js');
    workerCode = readFileSync(workerPath, 'utf-8');
  });

  describe('Mock Data Generation Removal', () => {
    it('should not contain generateMockAnalysis function', () => {
      expect(workerCode).not.toMatch(/function generateMockAnalysis/);
      expect(workerCode).not.toMatch(/generateMockAnalysis\s*\(/);
    });

    it('should not contain mock data fallbacks', () => {
      expect(workerCode).not.toMatch(/Fallback to mock analysis/);
      expect(workerCode).not.toMatch(/generateMockAnalysis\(analyzer\)/);
    });

    it('should not contain fake FFT generation', () => {
      expect(workerCode).not.toMatch(/Generate some realistic-looking frequency data/);
      expect(workerCode).not.toMatch(/Math\.random\(\) \* 0\.1 \+ \(frequency < 1000/);
    });

    it('should not contain synthetic audio features', () => {
      expect(workerCode).not.toMatch(/Math\.sin\(time \* [0-9.]+\) \* [0-9.]+/);
      expect(workerCode).not.toMatch(/Generate realistic mock data/);
    });
  });

  describe('Production Environment Detection', () => {
    it('should contain production environment detection', () => {
      expect(workerCode).toMatch(/isProduction/);
      expect(workerCode).toMatch(/location\.hostname/);
    });

    it('should contain production safety comments', () => {
      expect(workerCode).toMatch(/PRODUCTION SAFE/);
      expect(workerCode).toMatch(/No mock data generation systems/);
    });
  });

  describe('Error Handling', () => {
    it('should throw errors instead of generating mock data', () => {
      expect(workerCode).toMatch(/Audio analysis unavailable.*Meyda library failed to load/);
      expect(workerCode).toMatch(/throw new Error\(errorMsg\)/);
    });

    it('should contain enhanced error reporting', () => {
      expect(workerCode).toMatch(/Enhanced error reporting/);
      expect(workerCode).toMatch(/errorDetails/);
    });

    it('should provide user-friendly error messages', () => {
      expect(workerCode).toMatch(/Meyda library failed to load/);
      expect(workerCode).toMatch(/Please refresh the page/);
    });
  });

  describe('Meyda Dependency Validation', () => {
    it('should require Meyda for analysis', () => {
      expect(workerCode).toMatch(/if \(!Meyda\)/);
      expect(workerCode).toMatch(/Meyda library failed to load/);
    });

    it('should not provide fallback analysis without Meyda', () => {
      expect(workerCode).not.toMatch(/else.*mock/i);
      // Note: "fallback analysis" appears in comments but not as actual fallback code
      expect(workerCode).not.toMatch(/fallback.*analysis.*=/i);
    });
  });

  describe('Code Quality Assertions', () => {
    it('should not contain any Math.sin time-based mock generation', () => {
      const mockPatterns = [
        /Math\.sin\(time/,
        /performance\.now\(\) \/ 1000.*Math\.sin/,
        /\+ Math\.sin\(.*\) \*/
      ];
      
      mockPatterns.forEach(pattern => {
        expect(workerCode).not.toMatch(pattern);
      });
    });

    it('should not contain confidence values for mock data', () => {
      expect(workerCode).not.toMatch(/confidence: 0\.[0-9]/);
      expect(workerCode).not.toMatch(/timestamp: time/);
    });

    it('should contain removal comments for deleted functions', () => {
      expect(workerCode).toMatch(/REMOVED.*Real-time analysis loop functions/);
    });
  });
});
