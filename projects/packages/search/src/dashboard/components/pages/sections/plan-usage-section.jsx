import { ContextualUpgradeTrigger, ThemeProvider } from '@automattic/jetpack-components';
import { ExternalLink } from '@wordpress/components';
import { createInterpolateElement } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import React from 'react';
import DonutMeterContainer from '../../donut-meter-container';
import PlanSummary from './plan-summary';

// import './plan-usage-section.scss';

const usageInfoFromAPIData = apiData => {
	// Transform the data as necessary.
	// Are there better defaults for the Max values?
	// Should we recored, log, or otherwise surface potential errors here?
	return {
		recordCount: apiData?.currentUsage?.num_records || 0,
		recordMax: apiData?.currentPlan?.record_limit || 0,
		requestCount: apiData?.latestMonthRequests?.num_requests || 0,
		requestMax: apiData?.currentPlan.monthly_search_request_limit || 0,
	};
};

const upgradeTypeFromAPIData = apiData => {
	// Determine if upgrade message is needed.
	if ( ! apiData.currentUsage.must_upgrade ) {
		return null;
	}

	// Determine appropriate upgrade message.
	let mustUpgradeReason = '';
	if ( apiData.currentUsage.upgrade_reason.requests ) {
		mustUpgradeReason = 'requests';
	}
	if ( apiData.currentUsage.upgrade_reason.records ) {
		mustUpgradeReason = mustUpgradeReason === 'requests' ? 'both' : 'records';
	}

	return mustUpgradeReason;
};

const PlanUsageSection = ( { planInfo, sendPaidPlanToCart } ) => {
	// TODO: Add logic for plan limits.
	const upgradeType = upgradeTypeFromAPIData( planInfo );
	const usageInfo = usageInfoFromAPIData( planInfo );
	return (
		<div className="jp-search-dashboard-wrap jp-search-dashboard-meter-wrap">
			<div className="jp-search-dashboard-row">
				<div className="lg-col-span-2 md-col-span-1 sm-col-span-0"></div>
				<div className="jp-search-dashboard-meter-wrap__content lg-col-span-8 md-col-span-6 sm-col-span-4">
					<PlanSummary planInfo={ planInfo } />
					<UsageMeters usageInfo={ usageInfo } />
					<UpgradeTrigger type={ upgradeType } ctaCallback={ sendPaidPlanToCart } />
					<AboutPlanLimits />
				</div>
				<div className="lg-col-span-2 md-col-span-1 sm-col-span-0"></div>
			</div>
		</div>
	);
};

const getUpgradeMessages = () => {
	const upgradeMessages = {
		records: {
			description: __(
				"You’re close to exceeding this plan's number of records.",
				'jetpack-search-pkg'
			),
			cta: __(
				'Upgrade now to increase your monthly records limit and to avoid interruption!',
				'jetpack-search-pkg'
			),
		},
		requests: {
			description: __(
				"You’re close to exceeding this plan's number of requests.",
				'jetpack-search-pkg'
			),
			cta: __(
				'Upgrade now to increase your monthly requests limit and to avoid interruption!',
				'jetpack-search-pkg'
			),
		},
		both: {
			description: __(
				'You’re close to exceeding the number of records and search requests available in the free plan.',
				'jetpack-search-pkg'
			),
			cta: __(
				'Upgrade now to increase your limits and to avoid interruption!',
				'jetpack-search-pkg'
			),
		},
	};
	return upgradeMessages;
};

const UpgradeTrigger = ( { type, ctaCallback } ) => {
	const upgradeMessage = type && getUpgradeMessages()[ type ];
	const triggerData = upgradeMessage && { ...upgradeMessage, onClick: ctaCallback };

	return (
		<>
			{ triggerData && (
				<ThemeProvider>
					<ContextualUpgradeTrigger { ...triggerData } />
				</ThemeProvider>
			) }
		</>
	);
};

const UsageMeters = ( { usageInfo } ) => {
	// TODO: Implement icon callbacks.
	const recordsIconClickedCallback = () => {
		// eslint-disable-next-line no-console
		console.log( 'Icon clicked for records meter' );
	};
	const requestsIconClickedCallback = () => {
		// eslint-disable-next-line no-console
		console.log( 'Icon clicked for requests meter' );
	};
	// TODO: Implement callback for the toggle details link.
	// No callback, no toggle.

	return (
		<div className="usage-meter-group">
			<DonutMeterContainer
				title={ __( 'Site records', 'jetpack-search-pkg' ) }
				current={ usageInfo.recordCount }
				limit={ usageInfo.recordMax }
				iconClickedCallback={ recordsIconClickedCallback }
			/>
			<DonutMeterContainer
				title={ __( 'Search requests', 'jetpack-search-pkg' ) }
				current={ usageInfo.requestCount }
				limit={ usageInfo.requestMax }
				iconClickedCallback={ requestsIconClickedCallback }
			/>
		</div>
	);
};

const AboutPlanLimits = () => {
	return (
		<div className="usage-meter-about">
			{ createInterpolateElement(
				__(
					'Tell me more about <jpPlanLimits>record indexing and request limits</jpPlanLimits>. <jpExternalIcon></jpExternalIcon>',
					'jetpack-search-pkg'
				),
				{
					jpPlanLimits: (
						<a
							href="https://jetpack.com/support/search/"
							rel="noopener noreferrer"
							target="_blank"
							className="support-link"
						/>
					),
					jpExternalIcon: (
						<ExternalLink
							href="https://jetpack.com/support/search/"
							rel="noopener noreferrer"
							target="_blank"
							className="support-link"
						/>
					),
				}
			) }
		</div>
	);
};

export default PlanUsageSection;
