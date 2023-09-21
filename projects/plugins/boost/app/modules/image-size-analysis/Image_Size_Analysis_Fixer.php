<?php

namespace Automattic\Jetpack_Boost\Modules\Image_Size_Analysis;

class Image_Size_Analysis_Fixer {

	public static function setup() {
		add_filter( 'the_content', array( __CLASS__, 'fix_content' ), 99 );
		add_filter( 'wp_calculate_image_srcset', array( __CLASS__, 'fix_image_attachments' ), 10, 5 );
		add_filter( 'wp_calculate_image_sizes', array( __CLASS__, 'fix_image_sizes' ), 10, 5 );
	}

	public static function fix_url( $url ) {
		$url = preg_replace( '/-\d+x\d+\.jpg/', '.jpg', $url ); // remove "-1024x768" from the end of the URL.
		$url = preg_replace( '/\?.*/', '', $url ); // remove query string.
		$url = str_replace( 'i0.wp.com/', '', $url ); // remove i0.wp.com/ from the beginning of the URL.
		return $url;
	}

	public static function get_fixes( $post_id ) {
		static $fixes = array();

		if ( isset( $fixes[ $post_id ] ) ) {
			return $fixes[ $post_id ];
		}

		$fixes[ $post_id ] = get_post_meta( $post_id, 'jb_image_fixes', true );
		if ( ! $fixes[ $post_id ] ) {
			$fixes[ $post_id ] = array();
		}

		return $fixes[ $post_id ];
	}

	// phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
	public static function fix_image_attachments( $sources, $size_array, $image_src, $image_meta, $attachment_id ) {
		global $post;

		$fixes = self::get_fixes( $post->ID );

		$image_width = 0;

		// remove XxY dimension from $image_src as that's what's recorded by Image_Size_Analysis.
		$image_src_key = self::fix_url( $image_src );
		$attachment_id = attachment_url_to_postid( esc_url( $image_src ) );

		if ( $attachment_id && isset( $fixes[ $attachment_id ] ) ) {
			$image_width = $fixes[ $attachment_id ]['image_width'];
		} elseif ( isset( $fixes[ $image_src_key ] ) ) {
			$image_width = $fixes[ $image_src_key ]['image_width'];
		}

		if ( $image_width ) {
			$sources [ $image_width ] = array(
				'url'        => \Automattic\Jetpack\Image_CDN\Image_CDN_Core::cdn_url( $image_src, array( 'w' => $image_width ) ),
				'descriptor' => 'w',
				'value'      => $image_width,
			);
		}

		return $sources;
	}

	// phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
	public static function fix_image_sizes( $sizes, $size, $image_src, $image_meta, $attachment_id ) {
		global $post;
		$fixes         = self::get_fixes( $post->ID );
		$image_width   = 0;
		$image_src_key = self::fix_url( $image_src );
		$attachment_id = attachment_url_to_postid( esc_url( $image_src ) );

		if ( $attachment_id && isset( $fixes[ $attachment_id ] ) ) {
			$image_width = $fixes[ $attachment_id ]['image_width'];
		} elseif ( isset( $fixes[ $image_src_key ] ) ) {
			$image_width = $fixes[ $image_src_key ]['image_width'];
		}
		if ( $image_width ) {
			$sizes = sprintf( '(max-width: %1$dpx) 100vw, %1$dpx', $image_width );
		}

		return $sizes;
	}

	public static function fix_content( $content ) {
		global $post;

		$fixes = self::get_fixes( $post->ID );
		if ( ! $fixes ) {
			return $content;
		}

		$tag_processor = new \WP_HTML_Tag_Processor( $content );

		while ( $tag_processor->next_tag( array( 'tag_name' => 'img' ) ) ) {
			$image_src     = $tag_processor->get_attribute( 'src' );
			$image_src_key = md5( self::fix_url( $image_src ) );
			$srcset        = $tag_processor->get_attribute( 'srcset' );

			if ( ! isset( $fixes[ $image_src_key ] ) ) {
				continue;
			}

			if (
				isset( $fixes[ $image_src_key ]['image_width'] )
				&& ! strpos( (string) $srcset, ' ' . $fixes[ $image_src_key ]['image_width'] . 'w' )
			) {
				$tag_processor->set_attribute(
					'srcset',
					\Automattic\Jetpack\Image_CDN\Image_CDN_Core::cdn_url(
						$image_src,
						array( 'w' => $fixes[ $image_src_key ]['image_width'] )
					) . ' ' . $fixes[ $image_src_key ]['image_width'] . 'w, ' . $srcset
				);
			}

			if ( isset( $fixes[ $image_src_key ]['image_width'] ) ) {
				$tag_processor->set_attribute( 'sizes', sprintf( '(max-width: %1$dpx) 100vw, %1$dpx', $fixes[ $image_src_key ]['image_width'] ) );
			}
		}

		return $tag_processor->get_updated_html();
	}
}
