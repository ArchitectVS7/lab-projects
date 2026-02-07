// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage } from './nlpParser';

describe('nlpParser', () => {
    it('parses simple task title', () => {
        const result = parseNaturalLanguage('Buy milk');
        expect(result.title).toBe('Buy milk');
        expect(result.dueDate).toBeNull();
        expect(result.priority).toBeNull();
    });

    it('parses priority keywords', () => {
        const urgent = parseNaturalLanguage('Fix bug urgent');
        expect(urgent.priority).toBe('URGENT');
        expect(urgent.title).toBe('Fix bug');

        const high = parseNaturalLanguage('Review PR high priority');
        expect(high.priority).toBe('HIGH');
        expect(high.title).toBe('Review PR');
    });

    it('parses dates via chrono-node', () => {
        const tomorrow = parseNaturalLanguage('Meeting tomorrow');
        expect(tomorrow.dueDate).not.toBeNull();
    });

    it('parses project hashtag', () => {
        const result = parseNaturalLanguage('Deploy to #production');
        expect(result.projectHint).toBe('production');
        expect(result.title).toBe('Deploy to');
    });

    it('parses combined input', () => {
        const result = parseNaturalLanguage('Submit report by Friday high #finance');
        expect(result.title).toBe('Submit report');
        expect(result.priority).toBe('HIGH');
        expect(result.projectHint).toBe('finance');
        expect(result.dueDate).not.toBeNull();
    });
});
