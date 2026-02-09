import { supabaseAdmin } from '../infrastructure/database/supabaseClient.js';
import { Logger } from '../shared/utils/logger.js';

const FREE_TRIAL_SLUG = 'free-trial';

export class FreeTrialService {
  public static async grantFreeTrial(userId: string): Promise<void> {
    try {
      const { data: pkg, error: pkgError } = await supabaseAdmin
        .from('app_packages')
        .select('id')
        .eq('slug', FREE_TRIAL_SLUG)
        .eq('is_active', true)
        .single();

      if (pkgError) {
        Logger.warn('Free trial package not found, skipping trial grant', 'FREE_TRIAL_SERVICE');
        return;
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const { error: insertError } = await supabaseAdmin
        .from('app_subscriptions')
        .insert({
          profile_id: userId,
          package_id: pkg.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'active',
          paystack_subscription_code: null,
          paystack_customer_code: null,
          paystack_email_token: null,
          paystack_transaction_reference: null,
          current_period_end: null,
        });

      if (insertError) {
        Logger.error('Failed to grant free trial', 'FREE_TRIAL_SERVICE', { error: insertError.message, userId });
        return;
      }

      Logger.info(`Free trial granted to user ${userId}`, 'FREE_TRIAL_SERVICE');
    } catch (error) {
      Logger.error('Unexpected error granting free trial', 'FREE_TRIAL_SERVICE', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
    }
  }
}
