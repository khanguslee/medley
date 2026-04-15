import { z } from 'zod';

export const HealthCheckSchema = z.object({ ok: z.boolean() });
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
