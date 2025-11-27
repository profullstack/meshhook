/**
 * Datafa.st Analytics Utility Module
 *
 * Provides a clean API for tracking user interactions and events
 * across the MeshHook application.
 *
 * @module analytics
 */

/**
 * Track a custom event with datafa.st
 *
 * @param {string} eventName - The name of the event to track
 * @param {Object} [properties={}] - Optional properties to include with the event
 * @returns {void}
 *
 * @example
 * // Track a simple event
 * trackEvent('button_click');
 *
 * @example
 * // Track an event with properties
 * trackEvent('workflow_created', { workflow_id: 'wf_123', node_count: 5 });
 */
export const trackEvent = (eventName, properties = {}) => {
	if (typeof window === 'undefined') return;

	try {
		window?.datafast?.(eventName, properties);
	} catch (error) {
		console.warn(`[Analytics] Failed to track event "${eventName}":`, error);
	}
};

/**
 * Track a page view
 *
 * @param {string} [path] - Optional path to track (defaults to current path)
 * @returns {void}
 */
export const trackPageView = (path) => {
	if (typeof window === 'undefined') return;

	try {
		const pagePath = path ?? window.location.pathname;
		window?.datafast?.('pageview', { path: pagePath });
	} catch (error) {
		console.warn('[Analytics] Failed to track page view:', error);
	}
};

/**
 * Identify a user for tracking
 *
 * @param {Object} user - User information
 * @param {string} [user.id] - User ID
 * @param {string} [user.email] - User email
 * @param {string} [user.name] - User name
 * @returns {void}
 */
export const identifyUser = (user) => {
	if (typeof window === 'undefined') return;

	try {
		const { id, email, name, ...rest } = user;
		window?.datafast?.('identify', {
			user_id: id,
			email,
			name,
			...rest
		});
	} catch (error) {
		console.warn('[Analytics] Failed to identify user:', error);
	}
};

// ============================================
// Pre-defined Event Tracking Functions
// ============================================

/**
 * Track workflow creation
 *
 * @param {Object} workflow - Workflow details
 * @param {string} workflow.id - Workflow ID
 * @param {string} [workflow.name] - Workflow name
 * @param {number} [workflow.nodeCount] - Number of nodes
 */
export const trackWorkflowCreated = (workflow) => {
	trackEvent('workflow_created', {
		workflow_id: workflow.id,
		workflow_name: workflow.name,
		node_count: workflow.nodeCount
	});
};

/**
 * Track workflow execution
 *
 * @param {Object} workflow - Workflow details
 * @param {string} workflow.id - Workflow ID
 * @param {string} [workflow.status] - Execution status (success/failure)
 * @param {number} [workflow.duration] - Execution duration in ms
 */
export const trackWorkflowExecuted = (workflow) => {
	trackEvent('workflow_executed', {
		workflow_id: workflow.id,
		status: workflow.status,
		duration_ms: workflow.duration
	});
};

/**
 * Track workflow saved/updated
 *
 * @param {Object} workflow - Workflow details
 * @param {string} workflow.id - Workflow ID
 * @param {string} [workflow.name] - Workflow name
 */
export const trackWorkflowSaved = (workflow) => {
	trackEvent('workflow_saved', {
		workflow_id: workflow.id,
		workflow_name: workflow.name
	});
};

/**
 * Track node added to workflow
 *
 * @param {Object} node - Node details
 * @param {string} node.type - Node type (http, transform, etc.)
 * @param {string} [node.workflowId] - Parent workflow ID
 */
export const trackNodeAdded = (node) => {
	trackEvent('node_added', {
		node_type: node.type,
		workflow_id: node.workflowId
	});
};

/**
 * Track webhook received
 *
 * @param {Object} webhook - Webhook details
 * @param {string} webhook.workflowId - Workflow ID
 * @param {string} [webhook.source] - Source of the webhook
 */
export const trackWebhookReceived = (webhook) => {
	trackEvent('webhook_received', {
		workflow_id: webhook.workflowId,
		source: webhook.source
	});
};

/**
 * Track user sign up
 *
 * @param {Object} user - User details
 * @param {string} [user.method] - Sign up method (email, oauth, etc.)
 */
export const trackSignUp = (user = {}) => {
	trackEvent('sign_up', {
		method: user.method ?? 'email'
	});
};

/**
 * Track user sign in
 *
 * @param {Object} user - User details
 * @param {string} [user.method] - Sign in method (email, oauth, etc.)
 */
export const trackSignIn = (user = {}) => {
	trackEvent('sign_in', {
		method: user.method ?? 'email'
	});
};

/**
 * Track checkout initiation (for billing/subscriptions)
 *
 * @param {Object} checkout - Checkout details
 * @param {string} [checkout.name] - Customer name
 * @param {string} [checkout.email] - Customer email
 * @param {string} [checkout.productId] - Product ID
 * @param {string} [checkout.plan] - Plan name
 */
export const trackInitiateCheckout = (checkout) => {
	trackEvent('initiate_checkout', {
		name: checkout.name,
		email: checkout.email,
		product_id: checkout.productId,
		plan: checkout.plan
	});
};

/**
 * Track feature usage
 *
 * @param {string} featureName - Name of the feature used
 * @param {Object} [details={}] - Additional details
 */
export const trackFeatureUsed = (featureName, details = {}) => {
	trackEvent('feature_used', {
		feature: featureName,
		...details
	});
};

/**
 * Track error occurrence
 *
 * @param {Object} error - Error details
 * @param {string} error.message - Error message
 * @param {string} [error.code] - Error code
 * @param {string} [error.context] - Context where error occurred
 */
export const trackError = (error) => {
	trackEvent('error_occurred', {
		error_message: error.message,
		error_code: error.code,
		context: error.context
	});
};

export default {
	trackEvent,
	trackPageView,
	identifyUser,
	trackWorkflowCreated,
	trackWorkflowExecuted,
	trackWorkflowSaved,
	trackNodeAdded,
	trackWebhookReceived,
	trackSignUp,
	trackSignIn,
	trackInitiateCheckout,
	trackFeatureUsed,
	trackError
};