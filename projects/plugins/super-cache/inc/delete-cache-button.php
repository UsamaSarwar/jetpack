<?php
if ( defined( 'WPSCDISABLEDELETEBUTTON' ) ) {
	return;
}

/**
 * Returns the home path of the current site (without domain).
 */
function wpsc_get_home_path() {
	return rtrim( (string) parse_url( get_option( 'home' ), PHP_URL_PATH ), '/' );
}

/**
 * Given a path and a parent path, returns the relative path.
 */
function wpsc_get_relative_path( $path, $parent_path ) {
	if ( strncmp( $path, $parent_path, strlen( $parent_path ) ) === 0 ) {
		return substr( $path, strlen( $parent_path ) );
	}

	return $path;
}

/**
 * Adds "Delete Cache" button in WP Toolbar.
 */
function wpsc_admin_bar_render( $wp_admin_bar ) {

	if ( ! function_exists( 'current_user_can' ) || ! is_user_logged_in() ) {
		return false;
	}

	$path_to_home = wpsc_get_home_path();
	if ( ( is_singular() || is_archive() || is_front_page() || is_search() ) && current_user_can( 'delete_others_posts' ) ) {
		$request_uri = ! empty( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$path        = wpsc_get_relative_path( $request_uri, $path_to_home );

		$wp_admin_bar->add_menu(
			array(
				'parent' => '',
				'id'     => 'delete-cache',
				'title'  => __( 'Delete Cache', 'wp-super-cache' ),
				'meta'   => array( 'title' => __( 'Delete cache of the current page', 'wp-super-cache' ) ),
				'href'   => wp_nonce_url( admin_url( 'index.php?action=delcachepage&path=' . rawurlencode( $path ) ), 'delete-cache-' . $path . '_0', 'nonce' ),
			)
		);
	}

	if ( is_admin() && ( wpsupercache_site_admin() || current_user_can( 'delete_others_posts' ) ) ) {
		$wp_admin_bar->add_menu(
			array(
				'parent' => '',
				'id'     => 'delete-cache',
				'title'  => __( 'Delete Cache', 'wp-super-cache' ),
				'meta'   => array( 'title' => __( 'Delete Super Cache cached files', 'wp-super-cache' ) ),
				'href'   => wp_nonce_url( admin_url( 'index.php?admin=1&action=delcachepage&path=' . rawurlencode( trailingslashit( $path_to_home ) ) ), 'delete-cache-' . trailingslashit( $path_to_home ) . '_1', 'nonce' ),
			)
		);
	}
}
add_action( 'admin_bar_menu', 'wpsc_admin_bar_render', 99 );

function wpsc_delete_cache_scripts() {
	if ( ! is_user_logged_in() ) {
		return;
	}

	if (
		is_plugin_active( 'amp/amp.php' ) ||
		( function_exists( 'ampforwp_is_amp_endpoint' ) && ampforwp_is_amp_endpoint() )
	) {
		wp_cache_debug( 'AMP detected. Not loading Delete Cache button JavaScript.' );
		return;
	}

	$path_to_home = wpsc_get_home_path();

	wp_enqueue_script( 'delete-cache-button', plugins_url( '/delete-cache-button.js', __FILE__ ), array( 'jquery' ), '1.0', 1 );

	if ( ( is_singular() || is_archive() || is_front_page() || is_search() ) && current_user_can( 'delete_others_posts' ) ) {
		// TODO: I suspect this codepath is never called, as this is only used from admin_enqueue_scripts action.
		$request_uri  = ! empty( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$path_to_home = wpsc_get_relative_path( $request_uri, $path_to_home );
		$admin        = 0;
	} else {
		$admin = 1;
	}

	if ( $path_to_home === '' ) {
		$path_to_home = '/';
	}

	$nonce = wp_create_nonce( 'delete-cache-' . $path_to_home . '_' . $admin );
	wp_localize_script(
		'delete-cache-button',
		'wpsc_ajax',
		array(
			'ajax_url' => admin_url( 'admin-ajax.php' ),
			'path'     => $path_to_home,
			'admin'    => $admin,
			'nonce'    => $nonce,
		)
	);
}
add_action( 'wp_ajax_ajax-delete-cache', 'wpsc_admin_bar_delete_cache_ajax' );
add_action( 'admin_enqueue_scripts', 'wpsc_delete_cache_scripts' );

/**
 * Delete cache for a specific page.
 */
function wpsc_admin_bar_delete_cache_ajax() {
	// response output
	header( 'Content-Type: application/json' );
	if ( ! wpsc_delete_cache_directory() ) {
		if ( defined( 'WPSCDELETEERROR' ) ) {
			return json_decode( constant( 'WPSCDELETEERROR' ) );
		} else {
			return json_decode( false );
		}
	}
}

function wpsc_delete_path_nonce_key( $path, $admin ) {
	return 'delete-cache-' . $path . '_' . $admin;
}

function wpsc_admin_bar_delete_cache() {
	$referer = wp_get_referer();

	if ( ! isset( $_GET['admin'] ) ) {
		$_GET['admin'] = 0;
	}

	foreach ( array( 'path', 'nonce', 'admin' ) as $part ) {
		if ( isset( $_GET[ $part ] ) ) {
			// Copying GET to POST. TODO: Surely we could just use REQUEST instead.
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
			$_POST[ $part ] = $_GET[ $part ];
		}
	}

	wpsc_delete_cache_directory();

	$req_path    = isset( $_POST['path'] ) ? sanitize_text_field( wp_unslash( $_POST['path'] ) ) : '';
	$nonce       = isset( $_POST['nonce'] ) ? sanitize_key( $_POST['nonce'] ) : '';
	$admin       = isset( $_POST['admin'] ) ? sanitize_key( $_POST['admin'] ) : '';
	$valid_nonce = $req_path && wp_verify_nonce( $nonce, wpsc_delete_path_nonce_key( $req_path, $admin ) );

	if (
		$valid_nonce
		&& $referer
		&& $req_path
		&& (
			false !== stripos( $referer, $req_path )
			|| 0 === stripos( $referer, wp_login_url() )
		)
	) {
		/**
		 * Hook into the cache deletion process after a successful cache deletion from the admin bar button.
		 *
		 * @since 1.9
		 *
		 * @param string $req_path Path of the page where the cache flush was requested.
		 * @param string $referer  Referer URL.
		 */
		do_action( 'wpsc_after_delete_cache_admin_bar', $req_path, $referer );

		if ( isset( $_POST['admin'] ) && intval( $_POST['admin'] ) > 0 ) {
			wp_safe_redirect( $referer );
		} else {
			wp_safe_redirect( esc_url_raw( home_url( $req_path ) ) );
		}
		exit;
	} else {
		die( 'Oops. Problem with nonce. Please delete cached page from settings page.' );
	}
}

if ( 'delcachepage' === filter_input( INPUT_GET, 'action' ) ) {
	add_action( 'admin_init', 'wpsc_admin_bar_delete_cache' );
}

function wpsc_delete_cache_directory() {
	if ( ! current_user_can( 'delete_others_posts' ) ) {
		return false;
	}

	$req_path    = isset( $_POST['path'] ) ? sanitize_text_field( wp_unslash( $_POST['path'] ) ) : '';
	$nonce       = isset( $_POST['nonce'] ) ? sanitize_key( $_POST['nonce'] ) : '';
	$admin       = isset( $_POST['admin'] ) ? sanitize_key( $_POST['admin'] ) : '';
	$valid_nonce = $req_path && wp_verify_nonce( $nonce, wpsc_delete_path_nonce_key( $req_path, $admin ) );

	if ( ! $valid_nonce ) {
		wp_cache_debug( 'wpsc_delete_cache_directory: nonce was not valid' );
		return false;
	}

	$path = $valid_nonce ? realpath( trailingslashit( get_supercache_dir() . str_replace( '..', '', preg_replace( '/:.*$/', '', $req_path ) ) ) ) : false;

	if ( $path ) {
		if ( isset( $_POST['admin'] ) && (int) $_POST['admin'] === 1 ) {
			global $file_prefix;
			wp_cache_debug( 'Cleaning cache for this site.' );
			wp_cache_clean_cache( $file_prefix );
			return;
		}
		$path           = trailingslashit( $path );
		$supercachepath = realpath( get_supercache_dir() );

		if ( false === wp_cache_confirm_delete( $path ) || 0 !== strpos( $path, $supercachepath ) ) {
			wp_cache_debug( 'Could not delete directory: ' . $path );
			define( 'WPSCDELETEERROR', 'Could not delete directory' );
			return false;
		}

		wp_cache_debug( 'Deleting cache files in directory: ' . $path );
		wpsc_delete_files( $path );
		return;
	} else {
		wp_cache_debug( 'wpsc_delete_cache_directory: Could not delete directory. It does not exist: ' . esc_attr( $req_path ) );
	}
}
