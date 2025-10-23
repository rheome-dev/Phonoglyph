#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const WEB_SRC = path.join(PROJECT_ROOT, 'apps/web/src');
const API_SRC = path.join(PROJECT_ROOT, 'apps/api/src');

// Files to exclude from processing
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'public/workers/meyda.min.js', // Third-party library
  'TECH_DEBT_AUDIT.md', // Documentation
  '.next/', // Next.js build files
  'dist/', // Build artifacts
  'public/workers/', // Worker files
  'meyda.min.js' // Third-party library
];

// Replacement patterns
const REPLACEMENTS = [
  // Frontend replacements (use debugLog)
  {
    pattern: /console\.log\(/g,
    replacement: 'debugLog.log(',
    files: [WEB_SRC],
    importNeeded: 'import { debugLog } from \'@/lib/utils\';'
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'debugLog.error(',
    files: [WEB_SRC],
    importNeeded: 'import { debugLog } from \'@/lib/utils\';'
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'debugLog.warn(',
    files: [WEB_SRC],
    importNeeded: 'import { debugLog } from \'@/lib/utils\';'
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'debugLog.info(',
    files: [WEB_SRC],
    importNeeded: 'import { debugLog } from \'@/lib/utils\';'
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'debugLog.debug(',
    files: [WEB_SRC],
    importNeeded: 'import { debugLog } from \'@/lib/utils\';'
  },
  
  // Backend replacements (use logger)
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.log(',
    files: [API_SRC],
    importNeeded: 'import { logger } from \'../lib/logger\';'
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    files: [API_SRC],
    importNeeded: 'import { logger } from \'../lib/logger\';'
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    files: [API_SRC],
    importNeeded: 'import { logger } from \'../lib/logger\';'
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
    files: [API_SRC],
    importNeeded: 'import { logger } from \'../lib/logger\';'
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
    files: [API_SRC],
    importNeeded: 'import { logger } from \'../lib/logger\';'
  }
];

// Get all files recursively
function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip excluded directories
          if (EXCLUDE_PATTERNS.some(pattern => fullPath.includes(pattern))) {
            continue;
          }
          traverse(fullPath);
        } else if (stat.isFile()) {
          // Check if file has one of the target extensions
          const ext = path.extname(fullPath);
          if (extensions.includes(ext)) {
            // Skip excluded files
            if (EXCLUDE_PATTERNS.some(pattern => fullPath.includes(pattern))) {
              continue;
            }
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${currentDir}:`, error.message);
    }
  }
  
  traverse(dir);
  return files;
}

// Check if file already has the required import
function hasImport(fileContent, importStatement) {
  return fileContent.includes(importStatement);
}

// Add import to file if needed
function addImport(filePath, fileContent, importStatement) {
  const lines = fileContent.split('\n');
  let importAdded = false;
  
  // Find the last import statement
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex >= 0) {
    // Add after the last import
    lines.splice(lastImportIndex + 1, 0, importStatement);
    importAdded = true;
  } else {
    // Add at the beginning if no imports found
    lines.unshift(importStatement);
    importAdded = true;
  }
  
  if (importAdded) {
    return lines.join('\n');
  }
  
  return fileContent;
}

// Process a single file
function processFile(filePath, replacements) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let needsImport = false;
    
    // Apply replacements
    for (const replacement of replacements) {
      if (replacement.files.some(targetDir => filePath.startsWith(targetDir))) {
        const originalContent = content;
        content = content.replace(replacement.pattern, replacement.replacement);
        
        if (content !== originalContent) {
          modified = true;
          needsImport = true;
        }
      }
    }
    
    // Add import if needed
    if (modified && needsImport) {
      const importStatement = REPLACEMENTS.find(r => 
        r.files.some(targetDir => filePath.startsWith(targetDir))
      )?.importNeeded;
      
      if (importStatement && !hasImport(content, importStatement)) {
        content = addImport(filePath, content, importStatement);
      }
    }
    
    // Write back if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Processed: ${path.relative(PROJECT_ROOT, filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('🧹 Starting console log cleanup (v2)...\n');
  
  let totalProcessed = 0;
  let totalFiles = 0;
  
  // Process web files
  console.log('📁 Processing web files...');
  const webFiles = getAllFiles(WEB_SRC);
  const webReplacements = REPLACEMENTS.filter(r => r.files.includes(WEB_SRC));
  
  for (const file of webFiles) {
    totalFiles++;
    if (processFile(file, webReplacements)) {
      totalProcessed++;
    }
  }
  
  // Process API files
  console.log('\n📁 Processing API files...');
  const apiFiles = getAllFiles(API_SRC);
  const apiReplacements = REPLACEMENTS.filter(r => r.files.includes(API_SRC));
  
  for (const file of apiFiles) {
    totalFiles++;
    if (processFile(file, apiReplacements)) {
      totalProcessed++;
    }
  }
  
  console.log(`\n🎉 Cleanup complete!`);
  console.log(`📊 Processed ${totalProcessed} files out of ${totalFiles} total files`);
  
  // Show remaining console logs in source files only
  console.log('\n🔍 Checking for remaining console logs in source files...');
  try {
    const result = execSync('find apps/web/src apps/api/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -l "console\\." | wc -l', { 
      encoding: 'utf8',
      cwd: PROJECT_ROOT 
    });
    const remainingFiles = parseInt(result.trim());
    console.log(`📈 Files with remaining console logs: ${remainingFiles}`);
    
    // Show some examples
    const examples = execSync('find apps/web/src apps/api/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -l "console\\." | head -5', { 
      encoding: 'utf8',
      cwd: PROJECT_ROOT 
    });
    if (examples.trim()) {
      console.log('\n📋 Example files with remaining console logs:');
      console.log(examples.trim().split('\n').map(f => `  - ${f}`).join('\n'));
    }
  } catch (error) {
    console.log('📈 Could not count remaining console logs');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { processFile, getAllFiles, REPLACEMENTS };
