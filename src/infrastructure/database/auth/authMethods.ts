import type { ISignupRequest, ISignupResponse, IProfile } from './types.js';
import { supabase, supabaseAdmin } from '../supabaseClient.js';
import { HttpError } from '../../../shared/types/errors/appError.js';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus.js';
import { Logger } from '../../../shared/utils/logger.js';
import { FreeTrialService } from '../../../utils/freeTrialService.js';

export default class AuthService {
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
      Logger.error('Supabase auth signup failed', 'AUTH_SERVICE', { error: authError.message });

      if (authError.message.includes('already registered')) {
        throw new HttpError(HTTP_STATUS.CONFLICT, 'User with this email already exists');
      }

      throw new HttpError(HTTP_STATUS.BAD_REQUEST, authError.message);
    }

    if (!authData.user) {
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create user');
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        phone,
        role: 'User',
      });

    if (profileError) {
      Logger.error('Failed to create profile', 'AUTH_SERVICE', { error: profileError.message });
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

  public static async getProfileById(userId: string): Promise<IProfile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone, role, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      Logger.error('Failed to fetch profile', 'AUTH_SERVICE', { error: error.message });
      return null;
    }

    return data as IProfile;
  }
}
