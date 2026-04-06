/**
 * Property-Based Tests for Amharic Localization
 * Feature: amharic-localization
 */

import fc from 'fast-check';
import enTranslations from '@/messages/en.json';
import amTranslations from '@/messages/am.json';

/**
 * Helper function to get all nested keys from a translation object
 */
function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Helper function to get value from nested object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

describe('Property-Based Tests - Amharic Localization', () => {
  /**
   * Property 1: Translation Key Consistency Across Locales
   * 
   * **Validates: Requirements 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**
   * 
   * For any translation key that exists in the English translation file,
   * the same key must exist in the Amharic translation file with a non-empty value.
   */
  describe('Property 1: Translation Key Consistency Across Locales', () => {
    it('should have all English keys present in Amharic translations', () => {
      const enKeys = getAllKeys(enTranslations);
      
      fc.assert(
        fc.property(
          fc.constantFrom(...enKeys),
          (key) => {
            const amValue = getNestedValue(amTranslations, key);
            
            // The key must exist in Amharic translations
            expect(amValue).toBeDefined();
            
            // The value must not be null or undefined
            expect(amValue).not.toBeNull();
            expect(amValue).not.toBeUndefined();
            
            // If it's a string, it must not be empty
            if (typeof amValue === 'string') {
              expect(amValue.trim()).not.toBe('');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have all Amharic keys present in English translations', () => {
      const amKeys = getAllKeys(amTranslations);
      
      fc.assert(
        fc.property(
          fc.constantFrom(...amKeys),
          (key) => {
            const enValue = getNestedValue(enTranslations, key);
            
            // The key must exist in English translations
            expect(enValue).toBeDefined();
            
            // The value must not be null or undefined
            expect(enValue).not.toBeNull();
            expect(enValue).not.toBeUndefined();
            
            // If it's a string, it must not be empty
            if (typeof enValue === 'string') {
              expect(enValue.trim()).not.toBe('');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have matching structure between English and Amharic translations', () => {
      const enKeys = getAllKeys(enTranslations).sort();
      const amKeys = getAllKeys(amTranslations).sort();
      
      // Both translation files should have the exact same keys
      expect(enKeys).toEqual(amKeys);
    });

    it('should have non-empty values for all translation keys', () => {
      const allKeys = getAllKeys(enTranslations);
      
      fc.assert(
        fc.property(
          fc.constantFrom(...allKeys),
          (key) => {
            const enValue = getNestedValue(enTranslations, key);
            const amValue = getNestedValue(amTranslations, key);
            
            // Both values must be strings (not objects)
            expect(typeof enValue).toBe('string');
            expect(typeof amValue).toBe('string');
            
            // Both values must be non-empty after trimming
            expect((enValue as string).trim().length).toBeGreaterThan(0);
            expect((amValue as string).trim().length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve placeholder patterns in translations', () => {
      const allKeys = getAllKeys(enTranslations);
      const keysWithPlaceholders = allKeys.filter(key => {
        const enValue = getNestedValue(enTranslations, key);
        return typeof enValue === 'string' && enValue.includes('{');
      });
      
      if (keysWithPlaceholders.length === 0) {
        // Skip test if no placeholders exist
        return;
      }
      
      fc.assert(
        fc.property(
          fc.constantFrom(...keysWithPlaceholders),
          (key) => {
            const enValue = getNestedValue(enTranslations, key) as string;
            const amValue = getNestedValue(amTranslations, key) as string;
            
            // Extract placeholders from English translation
            const enPlaceholders = enValue.match(/\{[^}]+\}/g) || [];
            const amPlaceholders = amValue.match(/\{[^}]+\}/g) || [];
            
            // Amharic translation must have the same placeholders
            expect(amPlaceholders.sort()).toEqual(enPlaceholders.sort());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
