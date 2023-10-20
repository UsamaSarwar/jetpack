/**
 * External dependencies
 */
import { Button } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
/**
 * Internal dependencies
 */
import './style.scss';
import useAICheckout from '../../../../blocks/ai-assistant/hooks/use-ai-checkout';
import useAIFeature from '../../../../blocks/ai-assistant/hooks/use-ai-feature';
import UsageBar from '../usage-bar';

export default function UsagePanel() {
	const { checkoutUrl, autosaveAndRedirect, isRedirecting } = useAICheckout();

	// fetch usage data
	const { hasFeature } = useAIFeature();

	return (
		<div className="jetpack-ai-usage-panel-control">
			<p>
				{
					// translators: %1$d: current request counter; %2$d: request allowance;
					sprintf( __( '%1$d / %2$d free requests.', 'jetpack' ), 10, 20 )
				}
			</p>

			<UsageBar usage={ 0.5 } />

			<p className="muted">
				{
					// translators: %1$d: number of days until the next usage count reset
					sprintf( __( 'Requests will reset in %1$d days.', 'jetpack' ), 10 )
				}
			</p>

			{ ! hasFeature && (
				<Button
					variant="primary"
					label="Upgrade your Jetpack AI plan"
					href={ checkoutUrl }
					onClick={ autosaveAndRedirect }
					disabled={ isRedirecting }
				>
					Upgrade
				</Button>
			) }
		</div>
	);
}
