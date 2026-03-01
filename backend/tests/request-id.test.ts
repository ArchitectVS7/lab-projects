/**
 * Tests for the X-Request-Id / X-API-Version middleware and requestId on 500
 * error responses.
 *
 * We test against the real app for the header presence (happy-path) and build
 * a minimal test-local Express app to exercise the 500 code path without
 * mutating the shared app singleton.
 */
import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { errorHandler } from '../src/middleware/errorHandler.js';
import app from '../src/app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Express app that replicates the request-ID middleware and
 *  wires in the real errorHandler.  Used to test the 500 code path in
 *  isolation without touching the production app singleton. */
function buildTestApp(routeHandler: (req: Request, res: Response, next: NextFunction) => void) {
  const testApp = express();

  // Replicate the same request-ID middleware as app.ts
  testApp.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-Id', res.locals.requestId as string);
    res.setHeader('X-API-Version', '1');
    next();
  });

  testApp.get('/test-route', routeHandler);

  // Wire the real error handler so the behavior is identical to production
  testApp.use(errorHandler);

  return testApp;
}

// ---------------------------------------------------------------------------
// Suite 1: Headers present on every response (tested against the real app)
// ---------------------------------------------------------------------------

describe('Request ID & API Version headers', () => {
  it('every response includes X-Request-Id header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('every response includes X-API-Version: 1 header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-api-version']).toBe('1');
  });

  it('request IDs are unique across requests', async () => {
    const [r1, r2] = await Promise.all([
      request(app).get('/health'),
      request(app).get('/health'),
    ]);
    expect(r1.headers['x-request-id']).not.toBe(r2.headers['x-request-id']);
  });

  it('404 responses also carry X-Request-Id', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist-ever');
    expect(res.status).toBe(404);
    expect(res.headers['x-request-id']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Suite 2: 500 responses include requestId in the JSON body
// ---------------------------------------------------------------------------

describe('500 error response includes requestId', () => {
  it('requestId in body matches X-Request-Id header', async () => {
    const throwingApp = buildTestApp((_req, _res, next) => {
      next(new Error('Simulated unhandled error'));
    });

    const res = await request(throwingApp).get('/test-route');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body.requestId).toBeDefined();
    expect(res.body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    // The body requestId must equal the header value for easy support correlation
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('AppError (4xx) does NOT include requestId in body', async () => {
    const { AppError } = await import('../src/middleware/errorHandler.js');
    const appErrorApp = buildTestApp((_req, _res, next) => {
      next(new AppError('Not found', 404));
    });

    const res = await request(appErrorApp).get('/test-route');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
    // AppError responses are deterministic — no need to expose a requestId
    expect(res.body.requestId).toBeUndefined();
  });
});
