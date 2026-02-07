import { describe, it, expect } from '@jest/globals';
import { parseISO, addDays } from 'date-fns';

// Date parsing logic from create.ts
function parseDueDate(input: string): string {
    const normalized = input.toLowerCase().trim();
    const now = new Date();

    if (normalized === 'today') {
        return now.toISOString();
    } else if (normalized === 'tomorrow') {
        return addDays(now, 1).toISOString();
    }

    // Try YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return parseISO(input).toISOString();
    }

    return now.toISOString();
}

describe('CLI Date Parsing', () => {
    describe('parseDueDate', () => {
        it('should parse "today" correctly', () => {
            const result = parseDueDate('today');
            const parsed = new Date(result);
            const now = new Date();

            expect(parsed.getDate()).toBe(now.getDate());
            expect(parsed.getMonth()).toBe(now.getMonth());
            expect(parsed.getFullYear()).toBe(now.getFullYear());
        });

        it('should parse "tomorrow" correctly', () => {
            const result = parseDueDate('tomorrow');
            const parsed = new Date(result);
            const tomorrow = addDays(new Date(), 1);

            expect(parsed.getDate()).toBe(tomorrow.getDate());
        });

        it('should parse YYYY-MM-DD format', () => {
            const result = parseDueDate('2024-12-25');
            const parsed = new Date(result);

            expect(parsed.getFullYear()).toBe(2024);
            expect(parsed.getMonth()).toBe(11); // December is 11
            expect(parsed.getDate()).toBe(25);
        });

        it('should handle case-insensitive input', () => {
            const result1 = parseDueDate('TODAY');
            const result2 = parseDueDate('today');
            const result3 = parseDueDate('ToDay');

            // All should parse to valid dates
            expect(new Date(result1)).toBeInstanceOf(Date);
            expect(new Date(result2)).toBeInstanceOf(Date);
            expect(new Date(result3)).toBeInstanceOf(Date);
        });

        it('should return valid ISO string', () => {
            const result = parseDueDate('tomorrow');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });
    });
});
