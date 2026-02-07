import { describe, it, expect, beforeEach } from '@jest/globals';
import { config } from '../config/store.js';

describe('CLI Config Store', () => {
    beforeEach(() => {
        // Clear config before each test
        config.clear();
    });

    describe('apiKey', () => {
        it('should store and retrieve API key', () => {
            const testKey = 'test-api-key-123';
            config.apiKey = testKey;
            expect(config.apiKey).toBe(testKey);
        });

        it('should return undefined when no API key is set', () => {
            expect(config.apiKey).toBeUndefined();
        });
    });

    describe('baseUrl', () => {
        it('should have default base URL', () => {
            expect(config.baseUrl).toBe('http://localhost:3000');
        });

        it('should store and retrieve custom base URL', () => {
            const testUrl = 'https://api.example.com';
            config.baseUrl = testUrl;
            expect(config.baseUrl).toBe(testUrl);
        });
    });

    describe('defaultProjectId', () => {
        it('should store and retrieve default project ID', () => {
            const testId = 'project-123';
            config.defaultProjectId = testId;
            expect(config.defaultProjectId).toBe(testId);
        });

        it('should return undefined when no default project is set', () => {
            expect(config.defaultProjectId).toBeUndefined();
        });

        it('should clear default project ID when set to undefined', () => {
            config.defaultProjectId = 'project-123';
            config.defaultProjectId = undefined;
            expect(config.defaultProjectId).toBeUndefined();
        });
    });

    describe('clear', () => {
        it('should clear all config values', () => {
            config.apiKey = 'test-key';
            config.baseUrl = 'https://example.com';
            config.defaultProjectId = 'project-123';

            config.clear();

            expect(config.apiKey).toBeUndefined();
            expect(config.baseUrl).toBe('http://localhost:3000'); // Default value
            expect(config.defaultProjectId).toBeUndefined();
        });
    });

    describe('getConfigPath', () => {
        it('should return a config path', () => {
            const path = config.getConfigPath();
            expect(path).toBeTruthy();
            expect(typeof path).toBe('string');
            expect(path).toContain('taskman-cli');
        });
    });
});
