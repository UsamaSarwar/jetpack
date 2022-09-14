import {
	AdminPage,
	AdminSection,
	AdminSectionHero,
	Container,
	Col,
} from '@automattic/jetpack-components';
import { useConnection } from '@automattic/jetpack-connection';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import React from 'react';
import { STORE_ID } from '../../store';
import PricingPage from '../pricing-page';
import SupportSection from '../support-section';
import ConnectionScreen from './../connection-screen';
import Header from './../header';
import InfoSection from './../info-section';
import Logo from './../logo';
import ToggleSection from './../toggle-section';
import './styles.module.scss';

const Admin = () => {
	const { isUserConnected, isRegistered } = useConnection();
	const showConnectionCard = ! isRegistered || ! isUserConnected;

	const { showPricingPage, hasPaidPlan } = useSelect( select => {
		const store = select( STORE_ID );
		return {
			showPricingPage: store.showPricingPage(),
			hasPaidPlan: store.hasPaidPlan(),
		};
	} );

	if ( showConnectionCard ) {
		return (
			<AdminPage
				moduleName={ __( 'Jetpack Social 1.0', 'jetpack-social' ) }
				showHeader={ false }
				showBackground={ false }
			>
				<Container horizontalSpacing={ 3 } horizontalGap={ 3 }>
					<Col>
						<ConnectionScreen />
					</Col>
				</Container>
			</AdminPage>
		);
	}

	if ( ! hasPaidPlan && showPricingPage ) {
		return <PricingPage />;
	}

	return (
		<AdminPage moduleName={ __( 'Jetpack Social 1.0', 'jetpack-social' ) } header={ <Logo /> }>
			<AdminSectionHero>
				<Header />
			</AdminSectionHero>
			<AdminSection>
				<ToggleSection />
			</AdminSection>
			<AdminSectionHero>
				<InfoSection />
			</AdminSectionHero>
			<AdminSection>
				<SupportSection />
			</AdminSection>
		</AdminPage>
	);
};

export default Admin;
