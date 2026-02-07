import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { formatPriority, formatStatus, shortId } from '../utils/formatting.js';

describe('CLI Formatting Utilities', () => {
    describe('formatPriority', () => {
        it('should format URGENT priority in red', () => {
            const result = formatPriority('URGENT');
            expect(result).toContain('URGENT');
        });

        it('should format HIGH priority in yellow', () => {
            const result = formatPriority('HIGH');
            expect(result).toContain('HIGH');
        });

        it('should format MEDIUM priority in blue', () => {
            const result = formatPriority('MEDIUM');
            expect(result).toContain('MEDIUM');
        });

        it('should format LOW priority in gray', () => {
            const result = formatPriority('LOW');
            expect(result).toContain('LOW');
        });

        it('should handle unknown priority', () => {
            const result = formatPriority('UNKNOWN');
            expect(result).toBe('UNKNOWN');
        });
    });

    describe('formatStatus', () => {
        it('should format DONE status with checkmark', () => {
            const result = formatStatus('DONE');
            expect(result).toContain('DONE');
            expect(result).toContain('✓');
        });

        it('should format IN_PROGRESS status with symbol', () => {
            const result = formatStatus('IN_PROGRESS');
            expect(result).toContain('IN_PROGRESS');
            expect(result).toContain('◐');
        });

        it('should format IN_REVIEW status with symbol', () => {
            const result = formatStatus('IN_REVIEW');
            expect(result).toContain('IN_REVIEW');
            expect(result).toContain('◎');
        });

        it('should format TODO status with symbol', () => {
            const result = formatStatus('TODO');
            expect(result).toContain('TODO');
            expect(result).toContain('○');
        });

        it('should handle unknown status', () => {
            const result = formatStatus('UNKNOWN');
            expect(result).toBe('UNKNOWN');
        });
    });

    describe('shortId', () => {
        it('should return first 8 characters of UUID', () => {
            const uuid = 'abc12345-6789-1011-1213-141516171819';
            const result = shortId(uuid);
            expect(result).toBe('abc12345');
            expect(result.length).toBe(8);
        });

        it('should handle short strings', () => {
            const short = 'abc';
            const result = shortId(short);
            expect(result).toBe('abc');
        });
    });
});
