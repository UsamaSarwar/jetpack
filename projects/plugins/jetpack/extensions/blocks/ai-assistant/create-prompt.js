/**
 * External dependencies
 */
import { select } from '@wordpress/data';
import debugFactory from 'debug';
/**
 * Internal dependencies
 */
import { LANGUAGE_MAP } from './i18n-dropdown-control';

// Maximum number of characters we send from the content
export const MAXIMUM_NUMBER_OF_CHARACTERS_SENT_FROM_CONTENT = 1024;

const debug = debugFactory( 'jetpack-ai-assistant:prompt' );

/*
 * Builds a prompt template based on context, rules and content
 *
 * @param {object} options                  - The prompt options.
 * @param {string} options.context          - The expected context to the prompt, e.g. "You are...".
 * @param {array} options.rules             - An array of rules to be followed.
 * @param {string} options.request          - The prompt request.
 * @param {string} options.content          - The content to be modified.
 * @param {string} options.language         - The language of the content.
 * @param {string} options.locale           - The locale of the content.
 * @param {boolean} options.addBlogPostData - Whether to add blog post data to the prompt.
 * @param {boolean} options.returnArray     - Whether to return an array of messages or a string.
 *
 * @return {string|array} The prompt.
 */
export const buildPromptTemplate = ( {
	context = 'You are an AI assistant block, a part of a product called Jetpack made by the company called Automattic',
	rules = [],
	request = null,
	content = null,
	language = null,
	locale = null,
	addBlogPostData = true,
	returnArray = true,
} ) => {
	if ( ! request && ! content ) {
		throw new Error( 'You must provide either a request or content' );
	}

	const messages = [ { role: 'system' } ];

	const postTitle = select( 'core/editor' ).getEditedPostAttribute( 'title' );
	const blogPostData =
		addBlogPostData && postTitle?.length
			? `
Blog post relevant data:
- Current title: ${ postTitle }
----------
`
			: '';

	// Language and Locale
	let langLocatePromptPart = language
		? `- Write in the language: ${ language }${
				LANGUAGE_MAP[ language ]?.label ? ` (${ LANGUAGE_MAP[ language ].label })` : ''
		  }.`
		: '';
	langLocatePromptPart += langLocatePromptPart.length && locale ? ` locale: ${ locale }.` : '';
	langLocatePromptPart += langLocatePromptPart.length ? '\n' : '';

	// Rules
	let extraRulePromptPart = '';
	if ( rules?.length ) {
		extraRulePromptPart = rules.map( rule => `- ${ rule }.` ).join( '\n' ) + '\n';
	}

	let job = 'Your job is to ';

	if ( returnArray ) {
		job +=
			'respond to the request from the user messages. The content of the current post is under "Content"';
	} else if ( !! request && ! content ) {
		job += 'respond to the request below, under "Request"';
	} else if ( ! request && !! content ) {
		job += 'modify the content below, under "Content"';
	} else {
		job +=
			'respond to the request below, under "Request". The content of the current post is under "Content"';
	}

	const requestPromptBlock = ! request
		? ''
		: `\nRequest:
${ request }`;

	const contentText = ! content
		? ''
		: `\nContent:
${ content }`;

	// Context content
	const contextPromptPart = requestPromptBlock && contentText ? `\n${ contentText }` : contentText;

	const prompt =
		`${ context }.
${ job }. Do this by following rules set in "Rules".

-------------
Rules:
- If you do not understand this request, regardless of language or any other rule, always answer exactly and without any preceding content with the following term and nothing else: __JETPACK_AI_ERROR__.
- Do not use the term __JETPACK_AI_ERROR__ in any other context.
${ extraRulePromptPart }- Output the generated content in markdown format.
- Do not include a top level heading by default.
- Only output generated content ready for publishing.
- Segment the content into paragraphs as deemed suitable.
` +
		langLocatePromptPart +
		`-----------` +
		blogPostData +
		`${ returnArray ? '' : requestPromptBlock }` +
		contextPromptPart +
		`
-----------`;

	if ( returnArray ) {
		messages[ 0 ].content = prompt;

		messages.push( {
			role: 'user',
			content: request,
		} );

		debug( messages );
		return messages;
	}

	debug( prompt );
	return prompt;
};

export function buildPrompt( {
	generatedContent,
	allPostContent,
	postContentAbove,
	currentPostTitle,
	options,
	prompt,
	returnArray,
	type,
	userPrompt,
} ) {
	switch ( type ) {
		/*
		 * Non-interactive types
		 */

		/*
		 * Generate content from title.
		 */
		case 'titleSummary':
			prompt = buildPromptTemplate( {
				returnArray,
				request: 'Please help me write a short piece for a blog post based on the content.',
				content: currentPostTitle,
			} );
			break;

		/*
		 * Continue generating from the content.
		 */
		case 'continue':
			prompt = buildPromptTemplate( {
				returnArray,
				request: 'Please continue writing from the content.',
				rules: [ 'Only output the continuation of the content, without repeating it' ],
				content: postContentAbove,
			} );
			break;

		/*
		 * Simplify the content.
		 */
		case 'simplify':
			prompt = buildPromptTemplate( {
				returnArray,
				request: 'Simplify the content.',
				rules: [
					'Use words and phrases that are easier to understand for non-technical people',
					'Output in the same language of the content',
					'Use as much of the original language as possible',
				],
				content: postContentAbove,
			} );
			break;

		/*
		 * Interactive only types
		 */

		/*
		 * Change the tone of the content.
		 */
		case 'changeTone':
			prompt = buildPromptTemplate( {
				returnArray,
				request: `Please, rewrite with a ${ options.tone } tone.`,
				content: options.contentType === 'generated' ? generatedContent : allPostContent,
			} );
			break;

		/*
		 * Make the content longer.
		 */
		case 'makeLonger':
			prompt = buildPromptTemplate( {
				returnArray,
				request: 'Make the content longer.',
				content: generatedContent,
			} );
			break;

		/*
		 * Make the content shorter.
		 */
		case 'makeShorter':
			prompt = buildPromptTemplate( {
				returnArray,
				request: 'Make the content shorter.',
				content: generatedContent,
			} );
			break;

		/*
		 * Types that can be interactive or non-interactive
		 */

		/*
		 * Summarize the content.
		 */
		case 'summarize':
			prompt = buildPromptTemplate( {
				returnArray,
				request: 'Summarize the content.',
				content: options.contentType === 'generated' ? generatedContent : allPostContent,
			} );
			break;

		/**
		 * Correct grammar and spelling
		 */
		case 'correctSpelling':
			prompt = buildPromptTemplate( {
				returnArray,
				request: 'Correct any spelling and grammar mistakes from the content.',
				content: options.contentType === 'generated' ? generatedContent : postContentAbove,
			} );
			break;

		/*
		 * Generate a title for this blog post, based on the content.
		 */
		case 'generateTitle':
			prompt = buildPromptTemplate( {
				returnArray,
				request: 'Generate a new title for this blog post',
				rules: [ 'Only output the raw title, without any prefix or quotes' ],
				content: options.contentType === 'generated' ? generatedContent : allPostContent,
			} );
			break;

		/**
		 * Change the language, based on options.language
		 */
		case 'changeLanguage':
			prompt = buildPromptTemplate( {
				returnArray,
				request: `Please, rewrite the content in the following language: ${ options.language }.`,
				content: options.contentType === 'generated' ? generatedContent : allPostContent,
			} );
			break;

		/**
		 * Open ended prompt from user
		 */
		case 'userPrompt':
			prompt = buildPromptTemplate( {
				returnArray,
				request: userPrompt,
				content: allPostContent || generatedContent,
			} );
			break;

		default:
			prompt = buildPromptTemplate( {
				returnArray,
				request: userPrompt,
				content: generatedContent,
			} );
			break;
	}
	return prompt;
}
