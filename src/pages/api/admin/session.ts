import type { APIRoute } from 'astro';
import { json } from '../../../lib/utils';

export const GET: APIRoute = ({ locals }) =>
  locals.accessToken ? json({ access_token: locals.accessToken }) : json({ error: 'Unauthorized' }, 401);
