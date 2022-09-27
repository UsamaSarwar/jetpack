import { JetpackLogo, numberFormat } from '@automattic/jetpack-components';
import { isComingSoon, isPrivateSite } from '@automattic/jetpack-shared-extension-utils';
import { PanelRow } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { PluginPrePublishPanel, PluginPostPublishPanel } from '@wordpress/edit-post';
import { store as editorStore } from '@wordpress/editor';
import { createInterpolateElement, useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import InspectorNotice from '../../shared/components/inspector-notice';
import { getSubscriberCount } from './api';
import './panel.scss';
import { META_NAME_FOR_POST_LEVEL_ACCESS_SETTINGS } from './constants';
import { NewsletterAccess } from './settings';

export default function SubscribePanels() {
	const [ subscriberCount, setSubscriberCount ] = useState( null );
	const [ postMeta, setPostMeta ] = useEntityProp( 'postType', 'post', 'meta' );

	const accessLevel = postMeta[ META_NAME_FOR_POST_LEVEL_ACCESS_SETTINGS ] ?? 'public';

	useEffect( () => {
		getSubscriberCount( count => setSubscriberCount( count ) );
	}, [] );

	// Only show this for posts for now (subscriptions are only available on posts).
	const postType = useSelect( select => select( editorStore ).getCurrentPostType(), [] );
	const postWasEverPublished = useSelect(
		select =>
			select( editorStore ).getEditedPostAttribute( 'meta' )?.jetpack_post_was_ever_published,
		[]
	);

	if ( 'post' !== postType ) {
		return null;
	}

	// Subscriptions will not be triggered for a post that was already published in the past
	if ( postWasEverPublished ) {
		return null;
	}

	// Subscriptions will not be triggered on private sites (on WordPress.com simple and WoA),
	// nor on sites that have not been launched yet.
	if ( isPrivateSite() || isComingSoon() ) {
		return null;
	}

	// Do not show any panels when we have no info about the subscriber count, or it is too low.
	const showNotices = Number.isFinite( subscriberCount ) && subscriberCount > 0;

	return (
		<>
			<PanelRow>
				<NewsletterAccess setPostMeta={ setPostMeta } accessLevel={ accessLevel } />
			</PanelRow>

			<PluginPrePublishPanel
				className="jetpack-subscribe-pre-publish-panel"
				initialOpen
				title={ __( 'Newsletter', 'jetpack' ) }
				icon={ <JetpackLogo showText={ false } height={ 16 } logoColor="#1E1E1E" /> }
			>
				{ showNotices && (
					<InspectorNotice>
						{ createInterpolateElement(
							sprintf(
								/* translators: %s is the number of subscribers */
								_n(
									'This post will be sent to <span>%s reader</span>',
									'This post will be sent to <span>%s readers</span>',
									subscriberCount,
									'jetpack'
								),
								numberFormat( subscriberCount )
							),
							{ span: <span className="jetpack-subscribe-reader-count" /> }
						) }
					</InspectorNotice>
				) }

				<NewsletterAccess setPostMeta={ setPostMeta } accessLevel={ accessLevel } />
			</PluginPrePublishPanel>
			<PluginPostPublishPanel className="jetpack-subscribe-post-publish-panel" initialOpen>
				{ showNotices && (
					<InspectorNotice>
						{ createInterpolateElement(
							sprintf(
								/* translators: %s is the number of subscribers */
								_n(
									'This post has been sent to <span>%s reader</span>',
									'This post has been sent to <span>%s readers</span>',
									subscriberCount,
									'jetpack'
								),
								numberFormat( subscriberCount )
							),
							{ span: <span className="jetpack-subscribe-reader-count" /> }
						) }
					</InspectorNotice>
				) }
			</PluginPostPublishPanel>
		</>
	);
}
