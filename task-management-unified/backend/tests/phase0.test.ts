import request from 'supertest';
import app from '../src/app';

describe('Phase 0: Scaffold & Data Layer', () => {
  describe('GET /health', () => {
    it('returns 200 with status ok and ISO timestamp', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      // Verify timestamp is valid ISO 8601
      const parsed = new Date(res.body.timestamp);
      expect(parsed.toISOString()).toBe(res.body.timestamp);
    });

    it('returns JSON content-type', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['content-type']).toMatch(/json/);
    });
  });

  describe('404 handler', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });

    it('returns 404 for unknown POST routes', async () => {
      const res = await request(app).post('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('Security headers (Helmet)', () => {
    it('sets security headers on responses', async () => {
      const res = await request(app).get('/health');
      // Helmet sets these by default
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('CORS configuration', () => {
    it('includes CORS headers for allowed origin', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});
