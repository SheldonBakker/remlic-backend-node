import type { ISignupRequest, ISignupResponse, IProfile } from './types';
import { supabase } from '../supabaseClient';
import db from '../databaseClient';
import {
  profiles,
  reminderSettings,
  appSubscriptions,
  firearms,
  vehicles,
  certificates,
  psiraOfficers,
  driverLicences,
} from '../schema/index';
import { eq } from 'drizzle-orm';
import { HttpError } from '../../../shared/types/errors/appError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import Logger from '../../../shared/utils/logger';
import { FreeTrialService } from '../../../useCase/freeTrialService';

export default class AuthService {
  private static readonly CONTEXT = 'AUTH_SERVICE';

  public static async signup(data: ISignupRequest): Promise<ISignupResponse> {
    const { email, phone, password } = data;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      phone,
      options: {
        data: {
          phone,
        },
      },
    });

    if (authError) {
      Logger.error(this.CONTEXT, 'Supabase auth signup failed', authError);

      if (authError.message.includes('already registered')) {
        throw new HttpError(HTTP_STATUS.CONFLICT, 'User with this email already exists');
      }

      throw new HttpError(HTTP_STATUS.BAD_REQUEST, authError.message);
    }

    if (!authData.user) {
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create user');
    }

    try {
      await db
        .insert(profiles)
        .values({
          id: authData.user.id,
          email,
          phone,
          role: 'User',
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            email,
            phone,
          },
        });
    } catch (error) {
      Logger.error(this.CONTEXT, 'Failed to create profile', error);
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'User created but profile creation failed');
    }

    await FreeTrialService.grantFreeTrial(authData.user.id);

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email ?? email,
        phone,
      },
      message: 'User registered successfully. Please check your email to verify your account.',
    };
  }

  public static async deleteAccount(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(reminderSettings).where(eq(reminderSettings.profile_id, userId));
      await tx.delete(appSubscriptions).where(eq(appSubscriptions.profile_id, userId));
      await tx.delete(firearms).where(eq(firearms.profile_id, userId));
      await tx.delete(vehicles).where(eq(vehicles.profile_id, userId));
      await tx.delete(certificates).where(eq(certificates.profile_id, userId));
      await tx.delete(psiraOfficers).where(eq(psiraOfficers.profile_id, userId));
      await tx.delete(driverLicences).where(eq(driverLicences.profile_id, userId));
      await tx.delete(profiles).where(eq(profiles.id, userId));
    });

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      Logger.warn(this.CONTEXT, `Database records deleted but Supabase auth deletion failed for user ${userId}: ${error.message}`);
    }
  }

  public static async getProfileById(userId: string): Promise<IProfile | null> {
    try {
      const [data] = await db
        .select({
          id: profiles.id,
          email: profiles.email,
          phone: profiles.phone,
          role: profiles.role,
          created_at: profiles.created_at,
        })
        .from(profiles)
        .where(eq(profiles.id, userId));

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        phone: data.phone,
        role: data.role as IProfile['role'],
        created_at: data.created_at.toISOString(),
      };
    } catch (error) {
      Logger.error(this.CONTEXT, 'Failed to fetch profile', error);
      return null;
    }
  }
}
