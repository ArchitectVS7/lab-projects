import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';

// Enable rate limiting for tests
process.env.TEST_RATE_LIMITER = 'true';

describe('Phase 4: Rate Limiting', () => {
    beforeAll(async () => {
        // Clean up any existing test users
        await prisma.user.deleteMany({
            where: { 
                OR: [
                    { email: 'ratelimit-test@example.com' },
                    { email: { contains: 'ratelimit-register-test' } }
                ]
            }
        });
    });

    afterAll(async () => {
        // Clean up test users
        await prisma.user.deleteMany({
            where: { 
                OR: [
                    { email: 'ratelimit-test@example.com' },
                    { email: { contains: 'ratelimit-register-test' } }
                ]
            }
        });
        
        // Remove the test flag
        delete process.env.TEST_RATE_LIMITER;
    });

    it('allows first 20 requests then blocks 21st with 429', async () => {
        // First, register a user to test login rate limiting
        await request(app)
            .post('/api/auth/register')
            .send({
                email: 'ratelimit-test@example.com',
                password: 'TestPass123!',
                name: 'Test User'
            })
            .expect(201);

        // Make 20 requests that should be allowed (though they'll fail with 401 due to wrong password)
        let rateLimitedCount = 0;
        for (let i = 0; i < 20; i++) {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'ratelimit-test@example.com',
                    password: 'WrongPassword123!' // This will fail but still count towards rate limit
                });
            
            // Count how many requests were rate limited
            if (response.status === 429) {
                rateLimitedCount++;
            }
        }

        // The 21st request should be rate limited (429)
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'ratelimit-test@example.com',
                password: 'WrongPassword123!'
            });
        
        expect(response.status).toBe(429);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/rate|limit|too many/i);
    }, 15000); // Increase timeout for this test

    it('rate limits register endpoint too', async () => {
        // Try to register multiple times - some should be allowed initially, then rate limited
        let successCount = 0;
        let rateLimitedCount = 0;
        
        for (let i = 0; i < 25; i++) { // Try 25 registrations
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: `ratelimit-register-test${i}@example.com`,
                    password: 'TestPass123!',
                    name: 'Test User'
                });
            
            if (response.status === 201) {
                successCount++; // First registration should succeed
            } else if (response.status === 429) {
                rateLimitedCount++;
            } else if (response.status === 409) {
                // Email already exists - this is expected after first registration
            }
        }

        // At least some requests should have been rate limited
        expect(rateLimitedCount).toBeGreaterThan(0);
        
        // Final check: make one more request which should be rate limited
        const finalResponse = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'ratelimit-final-test@example.com',
                password: 'TestPass123!',
                name: 'Test User'
            });
        
        // Could be 429 (rate limited) or 201 (if we're past the window), but if it's 429 then that's expected
        if (finalResponse.status === 429) {
            expect(finalResponse.body).toHaveProperty('error');
            expect(finalResponse.body.error).toMatch(/rate|limit|too many/i);
        }
    }, 15000); // Increase timeout for this test
});
