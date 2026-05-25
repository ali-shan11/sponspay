import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { TermsService } from './terms.service';

const CREATOR_TERMS_HTML = `
<h1>Creator Terms of Service</h1>

<h2>1. Agreement</h2>
<p>These Creator Terms of Service govern a creator's use of SponsPay. By registering, linking, or otherwise using the creator-facing service, the creator agrees to these Terms and the referenced policies.</p>

<h2>2. Eligibility and registration</h2>
<p>Creators must satisfy SponsPay's registration requirements, provide accurate information, and complete any identity, channel, phone-number, payout, or compliance steps SponsPay requires.</p>

<h2>3. Creator service</h2>
<p>SponsPay provides creators with tools to receive Premium Messages, receive notifications, view statuses, manage reply workflows, access dashboards, and receive payouts subject to these Terms and to applicable policy.</p>

<h2>4. Creator obligations</h2>
<p>Creators must comply with SponsPay rules, cooperate with onboarding and payout setup, maintain accurate contact and payout information, and avoid unlawful, misleading, abusive, infringing, or unsafe use of the service.</p>

<h2>5. Premium Message handling</h2>
<p>Accepted Premium Messages enter the creator's priority SponsPay flow. Creators are encouraged to reply personally. SponsPay may set service windows, message statuses, and response requirements, and may send platform-managed fallback responses when the creator does not reply in time.</p>

<h2>6. Revenue share and performance</h2>
<p>Creator earnings are subject to SponsPay's revenue-share program. SponsPay may vary revenue share based on creator-personal reply performance, account standing, market, pilot status, fraud risk, or other disclosed factors. Platform-managed fallback responses do not count as creator-personal replies for maximum-tier qualification unless SponsPay clearly states otherwise.</p>

<h2>7. Pending, earned, hold, and reversal states</h2>
<p>Amounts shown in the creator portal may be pending, earned, delayed, adjusted, refunded, or reversed depending on message status, response timing, payout setup, fraud or chargeback risk, or policy enforcement. SponsPay may hold or reverse creator earnings where necessary to protect the service or comply with law.</p>

<h2>8. Payouts</h2>
<p>Creators authorize SponsPay to pay them through the payout methods supported by SponsPay in relevant markets. SponsPay may require mobile-money, bank, or other payout details and may use alternate payout handling where configured conditions are not met or where operational or compliance constraints apply.</p>

<h2>9. Telegram and related creator-notification channels</h2>
<p>SponsPay may create, manage, or configure creator-notification and supporter-interaction surfaces such as Telegram channels. Creators understand that these surfaces are part of the SponsPay workflow, but passive presence or admin status alone does not create a guaranteed proof event for message viewing.</p>

<h2>10. Platform-managed responses</h2>
<p>SponsPay may respond on a platform-managed basis when a creator does not personally reply within the service window. Such responses exist to preserve user trust and do not automatically improve the creator's reply-performance score or revenue-share tier.</p>

<h2>11. Creator content and rights</h2>
<p>Creators retain the rights they have in their content, brand assets, and replies, but grant SponsPay the rights reasonably needed to operate, market, display, moderate, and administer the service.</p>

<h2>12. Taxes and compliance</h2>
<p>Creators are responsible for taxes, reporting, and compliance obligations associated with their use of the service, except to the extent SponsPay is legally required to collect, withhold, or report.</p>

<h2>13. Suspension and termination</h2>
<p>SponsPay may suspend, limit, downgrade, or terminate creator access for policy violations, fraud or safety concerns, repeated service failures, abuse, inactivity, legal risk, or other legitimate business reasons.</p>

<h2>14. Disclaimers and limitation of liability</h2>
<p>To the maximum extent permitted by law, SponsPay provides the service on an "as is" and "as available" basis and disclaims implied warranties. SponsPay's liability is limited to the extent permitted by law.</p>

<h2>15. Program changes</h2>
<p>SponsPay may change revenue-share schedules, product features, status logic, service windows, payout rules, or other program terms with notice appropriate to the nature of the change.</p>

<h2>16. Final legal details</h2>
<p>Before publication, SponsPay should insert final governing-law, dispute-resolution, legal-entity, and contact details that reflect legal review and the company's final operating structure.</p>

<h2>Exhibit A — Current recommended revenue-share schedule</h2>
<p>This exhibit summarizes the current recommended performance ladder for creator economics. It is intended to be clear enough for creators to understand and operational teams to administer. The schedule should be paired with the definitions in the creator agreement and operational policy, especially the definition of creator-personal reply, the 14-day service window, the rolling 30-day measurement window, and the rule that platform-managed fallback responses do not count toward the maximum tier.</p>

<table>
<thead>
<tr><th>Rolling 30-day creator-personal reply rate</th><th>Revenue share</th></tr>
</thead>
<tbody>
<tr><td>Below 50%</td><td>70%</td></tr>
<tr><td>50%–74%</td><td>75%</td></tr>
<tr><td>75%–89%</td><td>80%</td></tr>
<tr><td>90% or higher</td><td>85%</td></tr>
</tbody>
</table>

<p>A creator should not qualify for the highest band until the creator has sufficient message volume to make the score meaningful. The current recommendation is a minimum of 20 Premium Messages in the rolling window. SponsPay may update the schedule or the gating rules with notice.</p>

<p>This exhibit is a draft operating recommendation and may be adjusted before publication or launch.</p>
`.trim();

@Injectable()
export class TermsSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(TermsSeeder.name);

  constructor(private readonly termsService: TermsService) {}

  async onApplicationBootstrap() {
    try {
      const existing = await this.termsService.getLatest();
      if (existing) {
        this.logger.log('Terms already exist, skipping seed.');
        return;
      }

      await this.termsService.create(CREATOR_TERMS_HTML);
      this.logger.log('Seeded initial creator terms of service (v1).');
    } catch (error) {
      this.logger.error('Terms seeding failed', error as any);
    }
  }
}
