import db from '../infrastructure/database/databaseClient';
import { appPackages, appSubscriptions } from '../infrastructure/database/schema/index';
import { eq, and } from 'drizzle-orm';
import Logger from '../shared/utils/logger';

const FREE_TRIAL_SLUG = 'free-trial';

export class FreeTrialService {
  public static async grantFreeTrial(userId: string): Promise<void> {
    try {
      const [pkg] = await db
        .select({ id: appPackages.id })
        .from(appPackages)
        .where(and(eq(appPackages.slug, FREE_TRIAL_SLUG), eq(appPackages.is_active, true)));

      if (!pkg) {
        Logger.warn('FREE_TRIAL_SERVICE', 'Free trial package not found, skipping trial grant');
        return;
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const startDateStr = startDate.toISOString().split('T')[0] ?? '';
      const endDateStr = endDate.toISOString().split('T')[0] ?? '';

      await db
        .insert(appSubscriptions)
        .values({
          profile_id: userId,
          package_id: pkg.id,
          start_date: startDateStr,
          end_date: endDateStr,
          status: 'active',
          paystack_subscription_code: null,
          paystack_customer_code: null,
          paystack_email_token: null,
          paystack_transaction_reference: null,
          current_period_end: null,
        });

      Logger.info('FREE_TRIAL_SERVICE', `Free trial granted to user ${userId}`);
    } catch (error) {
      Logger.error('FREE_TRIAL_SERVICE', `Unexpected error granting free trial (userId: ${userId})`, error);
    }
  }
}
