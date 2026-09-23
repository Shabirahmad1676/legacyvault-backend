const { validateUuidParams, ensureNotSelf, UUID_V4_REGEX } = require('../src/middleware/authorize.middleware');

describe('Authorization & IDOR Protection Middleware Tests', () => {
  describe('1. UUIDv4 Parameter Validation', () => {
    test('Should accept valid UUIDv4 strings', () => {
      const validUuid = 'c6d3e2d9-f1fd-4f40-8812-9fa66407684f';
      expect(UUID_V4_REGEX.test(validUuid)).toBe(true);

      const req = { params: { id: validUuid } };
      const res = {};
      const next = jest.fn();

      const middleware = validateUuidParams('id');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('Should reject invalid UUIDs, SQL injection strings, and path traversal with BadRequestError', () => {
      const malformedCases = [
        'not-a-uuid',
        '12345',
        'c6d3e2d9-f1fd-4f40-8812', // truncated
        "1' OR '1'='1", // SQL injection
        '../../etc/passwd', // path traversal
        '<script>alert(1)</script>', // XSS payload
      ];

      const middleware = validateUuidParams('owner_id');

      for (const badInput of malformedCases) {
        const req = { params: { owner_id: badInput } };
        const res = {};
        const next = jest.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const errorPassed = next.mock.calls[0][0];
        expect(errorPassed).toBeDefined();
        expect(errorPassed.statusCode).toBe(400);
        expect(errorPassed.message).toMatch(/Must be a valid UUIDv4 string/i);
      }
    });

    test('Should validate multiple parameters in a single route', () => {
      const middleware = validateUuidParams('owner_id', 'item_id');

      const reqValid = {
        params: {
          owner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          item_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        },
      };
      const nextValid = jest.fn();
      middleware(reqValid, {}, nextValid);
      expect(nextValid).toHaveBeenCalledWith();

      const reqInvalid = {
        params: {
          owner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          item_id: 'invalid-item-id',
        },
      };
      const nextInvalid = jest.fn();
      middleware(reqInvalid, {}, nextInvalid);
      const err = nextInvalid.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.message).toMatch(/parameter "item_id"/);
    });
  });

  describe('2. Anti-Self Action Guard', () => {
    test('Should reject when user targets their own ID', () => {
      const userId = '11111111-1111-4111-8111-111111111111';
      const req = {
        user: { user_id: userId },
        params: { owner_id: userId },
        body: {},
      };
      const next = jest.fn();

      const middleware = ensureNotSelf('owner_id');
      middleware(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.message).toMatch(/You cannot perform this action on your own account/i);
    });

    test('Should allow when user targets a different ID', () => {
      const req = {
        user: { user_id: '11111111-1111-4111-8111-111111111111' },
        params: { owner_id: '22222222-2222-4222-8222-222222222222' },
        body: {},
      };
      const next = jest.fn();

      const middleware = ensureNotSelf('owner_id');
      middleware(req, {}, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});

