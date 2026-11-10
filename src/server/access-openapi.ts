const response = { description: 'JSON envelope {data,error}. User output: id, name, email, role, siteIds; never passwordHash.' };
const responses = {
  '200': response, '400': { description: 'Invalid body, site assignment or self-demotion' },
  '401': { description: 'Missing or expired session' }, '403': { description: 'Role or site is forbidden' },
  '404': { description: 'Record does not exist' }, '409': { description: 'Email already exists' },
};
const input = {
  type: 'object', required: ['name', 'email', 'role'], additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 }, email: { type: 'string', format: 'email' },
    password: { type: 'string', description: 'Required on create, minimum 12 characters, maximum 72 UTF-8 bytes. Empty on update preserves password.' },
    role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'EDITOR', 'PUBLISHER'] },
    siteIds: { type: 'array', maxItems: 500, items: { type: 'string' } },
  },
};
export const accessOpenapiSpec = {
  openapi: '3.0.3', info: { title: 'Kedata CMS Admin Access', version: '1.0.0', description: 'ADMIN manages users and all sites. Other roles require site membership. EDITOR mutates drafts only; PUBLISHER also publishes/schedules; MANAGER also manages menus, settings, audit, API explorer. Object IDs are resolved to their site before authorization. Session and membership checks also apply to version restore and media. Unknown roles are denied. Other existing admin endpoints retain their payload contracts, with 403 for forbidden role/site.' },
  servers: [{ url: '/api/admin' }], security: [{ AdminToken: [] }, { AdminCookie: [] }],
  components: { securitySchemes: { AdminToken: { type: 'apiKey', in: 'header', name: 'x-admin-token' }, AdminCookie: { type: 'apiKey', in: 'cookie', name: 'kd_cms_session' } } },
  paths: {
    '/calendar': { get: { summary: 'Editorial calendar for all permitted sites; month boundaries use Asia/Jakarta. Includes scheduled posts, published posts/pages, 12 newest drafts/review queue and scope counts; never content bodies or site secrets.', parameters: [{ name: 'month', in: 'query', required: true, schema: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' } }, { name: 'siteId', in: 'query', schema: { type: 'string' }, description: 'Optional; must belong to the current user scope.' }], responses } },
    '/me': { get: { summary: 'Current user with siteIds; ADMIN is unrestricted by this list', responses } },
    '/sites': { get: { summary: 'List permitted sites without apiKeyHash or webhookSecret', responses } },
    '/users': {
      get: { summary: 'List users and assignments (ADMIN)', responses },
      post: { summary: 'Create account and assignments (ADMIN); audit recorded', requestBody: { required: true, content: { 'application/json': { schema: { ...input, required: [...input.required, 'password'] } } } }, responses: { ...responses, '201': response } },
    },
    '/users/{id}': { put: { summary: 'Update account and assignments (ADMIN); revoke target sessions and record audit', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: input } } }, responses } },
    '/media/upload': {
      post: {
        summary: 'Upload media (5MB max); non-admin requires permitted siteId in query before upload starts',
        parameters: [{ name: 'siteId', in: 'query', schema: { type: 'string' }, description: 'Required for non-ADMIN; preferred over legacy multipart field.' }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' }, altText: { type: 'string' }, caption: { type: 'string' } } } } } },
        responses: { ...responses, '201': { description: 'Media created' } },
      },
    },
  },
};

for (const kind of ['pages', 'posts']) {
  Object.assign(accessOpenapiSpec.paths, {
    [`/${kind}/{id}/review`]: {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { summary: 'Review history for permitted site (10 newest)', responses },
      post: { summary: 'submit DRAFT for review; approve publishes; return requires note. Publisher role required for decisions. Pending content is locked; snapshot and audit are transactional.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['action', 'updatedAt'], properties: { action: { enum: ['submit', 'approve', 'return'] }, updatedAt: { type: 'string', format: 'date-time' }, note: { type: 'string', maxLength: 2000 } } } } } },
        responses: { ...responses, '409': { description: 'Content status or version changed; reload before deciding' } },
      },
    },
  });
}
