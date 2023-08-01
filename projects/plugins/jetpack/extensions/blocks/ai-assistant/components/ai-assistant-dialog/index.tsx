/**
 * External dependencies
 */
import { aiAssistantIcon, origamiPlaneIcon, useAiContext } from '@automattic/jetpack-ai-client';
import { PlainText } from '@wordpress/block-editor';
import { Icon, KeyboardShortcuts, Popover, Button } from '@wordpress/components';
import { useKeyboardShortcut } from '@wordpress/compose';
import { useRef, useEffect, useContext, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';
import React from 'react';
/**
 * Internal dependencies
 */
import './style.scss';
import { AiAssistantUiContext } from '../../extensions/ai-assistant/ui-context';

type AiAssistantDialogProps = {
	value: string;

	onFocusLost?: () => void;
	onChange: ( value: string ) => void;
	onRequest: () => void;

	// Key press event handler
	onDialogTabPress: () => void;
};

const noop = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function

/**
 * AiAssistantDialog react component
 *
 * @param {AiAssistantDialogProps} props - Component props
 * @returns {React.ReactElement} JSX component
 */
export default function AiAssistantDialog( props: AiAssistantDialogProps ): React.ReactElement {
	const { onFocusLost = noop, onChange, value, onRequest, onDialogTabPress } = props;

	const { requestingState } = useAiContext();

	// Hooks
	const inputRef = useRef( null );
	/*
	 * - Auto focus on the input field when the dialog is shown
	 * - Close the dialog when the input field loses focus
	 *   when onFocusLost is called
	 */
	useEffect( () => {
		if ( ! inputRef?.current ) {
			return;
		}

		const inputRefElement = inputRef.current;
		inputRefElement.focus();

		// Close when focus is lost
		const onCloseEventListner = inputRefElement.addEventListener( 'blur', onFocusLost );

		return () => {
			inputRefElement.removeEventListener( 'blur', onCloseEventListner );
		};
	}, [ onFocusLost ] );

	// Send request when the user presses enter
	useKeyboardShortcut( [ 'command+enter', 'ctrl+enter' ], onRequest, {
		target: inputRef,
	} );

	return (
		<div className="jetpack-ai-assistant-dialog__wrapper">
			<KeyboardShortcuts
				bindGlobal
				shortcuts={ {
					tab: () => onDialogTabPress(),
				} }
			/>

			<PlainText
				value={ value }
				onChange={ onChange }
				placeholder={ __( 'AI writing', 'jetpack' ) }
				className="jetpack-ai-assistant-dialog__input"
				disabled={ requestingState === 'requesting' || requestingState === 'suggesting' }
				ref={ inputRef }
			/>

			<Button
				className="jetpack-ai-assistant__prompt_button"
				onClick={ onRequest }
				isSmall={ true }
				label={ __( 'Send request', 'jetpack' ) }
				disabled={ ! value || requestingState === 'requesting' || requestingState === 'suggesting' }
			>
				<Icon icon={ origamiPlaneIcon } />
				{ __( 'Send', 'jetpack' ) }
			</Button>
		</div>
	);
}

type AiAssistantPopoverProps = {
	anchor: HTMLElement;
	show: boolean;
} & AiAssistantDialogProps;

export const AiAssistantPopover = ( {
	anchor,
	show,
	onRequest,
	...rest
}: AiAssistantPopoverProps ) => {
	const { toggleAssistant, showAssistant } = useContext( AiAssistantUiContext );

	const { requestingState } = useAiContext();
	const [ message, setMessage ] = useState( '' );
	if ( ! show ) {
		return null;
	}

	return (
		<Popover anchor={ anchor } className="jetpack-ai-assistant__popover">
			<KeyboardShortcuts
				bindGlobal
				shortcuts={ {
					'mod+/': toggleAssistant,
				} }
			>
				<div className="jetpack-ai-assistant-dialog__container">
					<div
						className={ classNames( 'ai-icon-wrapper', {
							[ `is-${ requestingState }` ]: true,
						} ) }
					>
						<Icon icon={ aiAssistantIcon } size={ 24 } />
					</div>

					<AiAssistantDialog
						{ ...rest }
						onChange={ value => {
							setMessage( value );
							showAssistant();
						} }
						onDialogTabPress={ console.log } // eslint-disable-line no-console
						value={ message }
						onRequest={ () => onRequest( message ) }
					/>
				</div>
			</KeyboardShortcuts>
		</Popover>
	);
};
