import type { Request } from 'express';
import type { UserRole } from '../../api/middleware/authMiddleware';
import type { IUserPermissions } from '../../infrastructure/database/subscriptions/types';

export interface IAuthUser {
  id: string;
  email: string | null;
  role: string | null;
  appRole: UserRole | null;
  permissions: IUserPermissions | null;
}

export interface AuthenticatedRequest extends Request {
  user?: IAuthUser;
  requestId?: string;
}
