/**
 * Every Profullstack service meshhook can call, as data. See ./compile.js for
 * the shape. Each action names the route file or doc it was taken from in
 * `source`, so a broken plugin can be traced to the API that moved.
 *
 * auth.type: 'bearer' (Authorization: Bearer <key>), 'header' (auth.header,
 * optional auth.prefix), 'query' (auth.param) or 'none'. auth.secret is the
 * default workflow-secret name the key is read from.
 */

export const PLUGINS = [
	{
		"id": "coinpay",
		"name": "CoinPay",
		"icon": "🪙",
		"category": "Payments",
		"url": "https://coinpayportal.com",
		"description": "Non-custodial crypto payment gateway: payments, invoices, checkout sessions, payouts",
		"baseUrl": "https://coinpayportal.com/api",
		"auth": {
			"type": "bearer",
			"secret": "COINPAY_API_KEY",
			"hint": "Business API key (cp_live_... or cp_test_...) from the CoinPay dashboard, Business > API keys. OAuth tokens with the merchant scope also work."
		},
		"actions": [
			{
				"id": "createPayment",
				"label": "Create payment",
				"method": "POST",
				"path": "/payments/create",
				"description": "Create a crypto payment request (address + amount) for a business",
				"params": [
					{
						"name": "business_id",
						"in": "body",
						"type": "string",
						"description": "Taken from the API key if omitted"
					},
					{
						"name": "amount_usd",
						"in": "body",
						"type": "number",
						"required": true,
						"description": "Amount in USD"
					},
					{
						"name": "currency",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "btc, eth, sol, usdc_sol, usdc_base, usdt_tron, ..."
					},
					{
						"name": "description",
						"in": "body",
						"type": "string",
						"description": "Shown to the payer"
					},
					{
						"name": "metadata",
						"in": "body",
						"type": "json",
						"description": "Your own key/values"
					},
					{
						"name": "redirect_url",
						"in": "body",
						"type": "string",
						"description": "Where the payer returns"
					},
					{
						"name": "expires_in_minutes",
						"in": "body",
						"type": "number",
						"description": "15 (default) to 120"
					}
				],
				"source": "/home/anthony/www/coinpayportal.com/app/src/app/api/payments/create/route.ts"
			},
			{
				"id": "getPayment",
				"label": "Get payment",
				"method": "GET",
				"path": "/payments/{id}",
				"description": "Payment status and details",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Payment id"
					}
				],
				"source": "/home/anthony/www/coinpayportal.com/app/src/app/api/payments/[id]/route.ts"
			},
			{
				"id": "listPayments",
				"label": "List payments",
				"method": "GET",
				"path": "/payments",
				"description": "List payments, with filters",
				"params": [
					{
						"name": "business_id",
						"in": "query",
						"type": "string",
						"description": "Business"
					},
					{
						"name": "status",
						"in": "query",
						"type": "string",
						"description": "Payment status"
					},
					{
						"name": "currency",
						"in": "query",
						"type": "string",
						"description": "Coin"
					},
					{
						"name": "date_from",
						"in": "query",
						"type": "string",
						"description": "ISO date"
					},
					{
						"name": "date_to",
						"in": "query",
						"type": "string",
						"description": "ISO date"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Page size"
					}
				],
				"source": "/home/anthony/www/coinpayportal.com/app/src/app/api/payments/route.ts"
			},
			{
				"id": "createCheckoutSession",
				"label": "Create checkout session",
				"method": "POST",
				"path": "/checkout/sessions",
				"description": "Hosted checkout where the buyer chooses the coin",
				"params": [
					{
						"name": "amount",
						"in": "body",
						"type": "number",
						"required": true,
						"description": "Amount"
					},
					{
						"name": "currency",
						"in": "body",
						"type": "string",
						"description": "Fiat currency"
					},
					{
						"name": "description",
						"in": "body",
						"type": "string",
						"description": "Description"
					},
					{
						"name": "metadata",
						"in": "body",
						"type": "json",
						"description": "Your own data"
					},
					{
						"name": "business_id",
						"in": "body",
						"type": "string",
						"description": "Taken from the key if omitted"
					}
				],
				"source": "/home/anthony/www/coinpayportal.com/app/src/app/api/checkout/sessions/route.ts (validateCreateSessionInput in src/lib/checkout/sessions.ts)"
			},
			{
				"id": "createInvoice",
				"label": "Create invoice",
				"method": "POST",
				"path": "/invoices",
				"description": "Create an invoice, optionally itemised or recurring. Supports an Idempotency-Key header",
				"params": [
					{
						"name": "amount",
						"in": "body",
						"type": "number",
						"description": "Total (or send line_items)"
					},
					{
						"name": "line_items",
						"in": "body",
						"type": "json",
						"description": "Itemised lines; the total is computed from them"
					},
					{
						"name": "currency",
						"in": "body",
						"type": "string",
						"description": "Fiat currency"
					},
					{
						"name": "crypto_currency",
						"in": "body",
						"type": "string",
						"description": "Coin to pay in"
					},
					{
						"name": "client_id",
						"in": "body",
						"type": "string",
						"description": "Client"
					},
					{
						"name": "due_date",
						"in": "body",
						"type": "string",
						"description": "ISO date"
					},
					{
						"name": "notes",
						"in": "body",
						"type": "string",
						"description": "Notes"
					},
					{
						"name": "schedule",
						"in": "body",
						"type": "json",
						"description": "{recurrence, custom_interval_days, end_date, max_occurrences}"
					}
				],
				"source": "/home/anthony/www/coinpayportal.com/app/src/app/api/invoices/route.ts"
			},
			{
				"id": "getRate",
				"label": "Get exchange rate",
				"method": "GET",
				"path": "/rates",
				"description": "Coin-to-fiat rate. Public, no key needed",
				"params": [
					{
						"name": "coin",
						"in": "query",
						"type": "string",
						"description": "e.g. BTC"
					},
					{
						"name": "coins",
						"in": "query",
						"type": "string",
						"description": "Comma list"
					},
					{
						"name": "fiat",
						"in": "query",
						"type": "string",
						"description": "Default USD"
					}
				],
				"source": "/home/anthony/www/coinpayportal.com/app/src/app/api/rates/route.ts; live GET https://coinpayportal.com/api/rates?coin=BTC returned 200"
			}
		]
	},
	{
		"id": "c0mpute",
		"name": "c0mpute",
		"icon": "🖥️",
		"category": "AI & compute",
		"url": "https://c0mpute.com",
		"description": "Decentralized compute: OpenAI-compatible chat, plus image and music generation on network workers",
		"baseUrl": "https://c0mpute.com",
		"auth": {
			"type": "bearer",
			"secret": "C0MPUTE_API_KEY",
			"hint": "c0k_... key: sign in with CoinPay at c0mpute.com/chat and create an API key there (or run `c0mpute chat login`)"
		},
		"actions": [
			{
				"id": "chatCompletion",
				"label": "Chat completion",
				"method": "POST",
				"path": "/v1/chat/completions",
				"description": "OpenAI-compatible chat completion",
				"params": [
					{
						"name": "model",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "A model id from /v1/models"
					},
					{
						"name": "messages",
						"in": "body",
						"type": "json",
						"required": true,
						"description": "[{role, content}]",
						"example": "[{\"role\":\"user\",\"content\":\"{{body.text}}\"}]"
					},
					{
						"name": "temperature",
						"in": "body",
						"type": "number",
						"description": "Sampling temperature"
					},
					{
						"name": "max_tokens",
						"in": "body",
						"type": "number",
						"description": "Output cap"
					}
				],
				"source": "/home/anthony/www/c0mpute.com/app/apps/web/src/app/v1/chat/completions/route.ts; https://c0mpute.com/llms.txt"
			},
			{
				"id": "listModels",
				"label": "List models",
				"method": "GET",
				"path": "/v1/models",
				"description": "Models served right now",
				"params": [],
				"source": "/home/anthony/www/c0mpute.com/app/apps/web/src/app/v1/models/route.ts; live GET returned 200"
			},
			{
				"id": "generateImage",
				"label": "Generate image",
				"method": "POST",
				"path": "/api/v1/images",
				"description": "Start an image job (202 {id, poll}). Poll getImage until it returns image/png",
				"params": [
					{
						"name": "prompt",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Prompt"
					},
					{
						"name": "size",
						"in": "body",
						"type": "string",
						"description": "landscape | square | portrait"
					}
				],
				"source": "/home/anthony/www/c0mpute.com/app/apps/web/src/app/api/v1/images/route.ts"
			},
			{
				"id": "getImage",
				"label": "Get image",
				"method": "GET",
				"path": "/api/v1/images/{id}",
				"description": "Poll an image job",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Job id"
					}
				],
				"source": "/home/anthony/www/c0mpute.com/app/apps/web/src/app/api/v1/images/[id]/route.ts"
			},
			{
				"id": "generateMusic",
				"label": "Generate music",
				"method": "POST",
				"path": "/api/v1/music",
				"description": "Start a song (ACE-Step). 202 {id, poll}",
				"params": [
					{
						"name": "prompt",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Style or description"
					},
					{
						"name": "lyrics",
						"in": "body",
						"type": "string",
						"description": "Leave empty for an instrumental"
					},
					{
						"name": "duration",
						"in": "body",
						"type": "number",
						"description": "10 to 600 seconds"
					}
				],
				"source": "/home/anthony/www/c0mpute.com/app/apps/web/src/app/api/v1/music/route.ts"
			},
			{
				"id": "getBalance",
				"label": "Get balance",
				"method": "GET",
				"path": "/api/v1/balance",
				"description": "The caller's compute balance",
				"params": [],
				"source": "/home/anthony/www/c0mpute.com/app/apps/web/src/app/api/v1/balance/route.ts"
			}
		]
	},
	{
		"id": "infernet",
		"name": "Infernet Protocol",
		"icon": "🔥",
		"category": "AI & compute",
		"url": "https://infernetprotocol.com",
		"description": "P2P GPU inference marketplace: OpenAI-compatible chat, batch jobs, live pricing",
		"baseUrl": "https://infernetprotocol.com",
		"auth": {
			"type": "bearer",
			"secret": "INFERNET_API_KEY",
			"hint": "ik_live_... key from the dashboard billing panel (infernetprotocol.com/dashboard), or POST /api/v1/keys while signed in"
		},
		"actions": [
			{
				"id": "chatCompletion",
				"label": "Chat completion",
				"method": "POST",
				"path": "/v1/chat/completions",
				"description": "OpenAI-compatible chat, routed to a P2P provider",
				"params": [
					{
						"name": "model",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Model id"
					},
					{
						"name": "messages",
						"in": "body",
						"type": "json",
						"required": true,
						"description": "[{role, content}]",
						"example": "[{\"role\":\"user\",\"content\":\"{{body.text}}\"}]"
					},
					{
						"name": "temperature",
						"in": "body",
						"type": "number",
						"description": "Temperature"
					},
					{
						"name": "max_tokens",
						"in": "body",
						"type": "number",
						"description": "Output cap"
					}
				],
				"source": "/home/anthony/www/infernetprotocol.com/app/apps/web/app/v1/chat/completions/route.js"
			},
			{
				"id": "listModels",
				"label": "List models",
				"method": "GET",
				"path": "/v1/models",
				"description": "Available models",
				"params": [],
				"source": "/home/anthony/www/infernetprotocol.com/app/apps/web/app/v1/models/route.js; live 200"
			},
			{
				"id": "getPricing",
				"label": "Get pricing",
				"method": "GET",
				"path": "/api/v1/pricing",
				"description": "Live per-model price per 1M tokens. Public",
				"params": [
					{
						"name": "model",
						"in": "query",
						"type": "string",
						"description": "One model"
					}
				],
				"source": "/home/anthony/www/infernetprotocol.com/app/apps/web/app/api/v1/pricing/route.js; live 200"
			},
			{
				"id": "quoteBatch",
				"label": "Quote batch",
				"method": "POST",
				"path": "/api/v1/batches/quote",
				"description": "Preflight cost for a batch. Never touches the balance",
				"params": [
					{
						"name": "model",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Model"
					},
					{
						"name": "items",
						"in": "body",
						"type": "json",
						"required": true,
						"description": "[{custom_id, messages, max_tokens, temperature?}]",
						"example": "[]"
					}
				],
				"source": "/home/anthony/www/infernetprotocol.com/app/apps/web/app/api/v1/batches/quote/route.js"
			},
			{
				"id": "createBatch",
				"label": "Create batch",
				"method": "POST",
				"path": "/api/v1/batches",
				"description": "Place a batch inference job against a hard cost cap",
				"params": [
					{
						"name": "quote_id",
						"in": "body",
						"type": "string",
						"description": "From quoteBatch (or send model + items)"
					},
					{
						"name": "model",
						"in": "body",
						"type": "string",
						"description": "Model"
					},
					{
						"name": "items",
						"in": "body",
						"type": "json",
						"description": "Batch items",
						"example": "[]"
					},
					{
						"name": "max_cost_usd",
						"in": "body",
						"type": "number",
						"required": true,
						"description": "Hard cap"
					},
					{
						"name": "idempotency_key",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "The same key returns the same batch"
					}
				],
				"source": "/home/anthony/www/infernetprotocol.com/app/apps/web/app/api/v1/batches/route.js"
			},
			{
				"id": "getBalance",
				"label": "Get balance",
				"method": "GET",
				"path": "/api/v1/billing/balance",
				"description": "Prepaid, wallet and earned-spendable balance",
				"params": [],
				"source": "/home/anthony/www/infernetprotocol.com/app/apps/web/app/api/v1/billing/balance/route.js"
			}
		]
	},
	{
		"id": "rssamp",
		"name": "RSSAmp (rssamplifier)",
		"icon": "📡",
		"category": "Data & search",
		"url": "https://rssamp.com",
		"description": "Open directory of independent blogs, news and podcast feeds: search, topics, submit feeds, webhooks",
		"baseUrl": "https://rssamp.com/api",
		"auth": {
			"type": "bearer",
			"secret": "RSSAMP_API_KEY",
			"optional": true,
			"hint": "Reads and submissions need no key. Webhooks and higher limits use rsa_<8hex>_<secret> from the account page (Bearer or X-API-Key)"
		},
		"actions": [
			{
				"id": "search",
				"label": "Search posts",
				"method": "GET",
				"path": "/search",
				"description": "Full-text search across posts and blogs",
				"params": [
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"required": true,
						"description": "Query"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "1 to 100"
					},
					{
						"name": "mode",
						"in": "query",
						"type": "string",
						"description": "all | any"
					},
					{
						"name": "kind",
						"in": "query",
						"type": "string",
						"description": "podcasts, news, music, videos, blogs"
					}
				],
				"source": "/home/anthony/www/rssamplifier.com/app/apps/web/src/app/api/search/route.js; live 200"
			},
			{
				"id": "getTopic",
				"label": "Get topic",
				"method": "GET",
				"path": "/topics/{keyword}",
				"description": "Feeds filed under a topic",
				"params": [
					{
						"name": "keyword",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Topic"
					},
					{
						"name": "group",
						"in": "query",
						"type": "string",
						"description": "blogs, podcasts, ..."
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Up to 500"
					},
					{
						"name": "offset",
						"in": "query",
						"type": "number",
						"description": "Offset"
					}
				],
				"source": "/home/anthony/www/rssamplifier.com/app/apps/web/src/app/api/topics/[keyword]/route.js; live 200"
			},
			{
				"id": "listFeeds",
				"label": "List feeds",
				"method": "GET",
				"path": "/feeds",
				"description": "Paginated directory",
				"params": [
					{
						"name": "kind",
						"in": "query",
						"type": "string",
						"description": "blog | podcast"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Up to 500"
					},
					{
						"name": "offset",
						"in": "query",
						"type": "number",
						"description": "Offset"
					}
				],
				"source": "/home/anthony/www/rssamplifier.com/app/apps/web/src/app/api/feeds/route.js"
			},
			{
				"id": "getFeed",
				"label": "Get feed",
				"method": "GET",
				"path": "/feeds/{slug}",
				"description": "One feed and its posts",
				"params": [
					{
						"name": "slug",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Feed slug"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Up to 200"
					}
				],
				"source": "/home/anthony/www/rssamplifier.com/app/apps/web/src/app/api/feeds/[slug]/route.js"
			},
			{
				"id": "submitFeed",
				"label": "Submit feed",
				"method": "POST",
				"path": "/submit",
				"description": "Submit one or more feed URLs, or an OPML document",
				"params": [
					{
						"name": "url",
						"in": "body",
						"type": "string",
						"description": "One feed or site URL"
					},
					{
						"name": "urls",
						"in": "body",
						"type": "json",
						"description": "Array of URLs"
					},
					{
						"name": "opml",
						"in": "body",
						"type": "string",
						"description": "OPML document"
					},
					{
						"name": "email",
						"in": "body",
						"type": "string",
						"description": "Notify when done"
					}
				],
				"source": "/home/anthony/www/rssamplifier.com/app/apps/web/src/app/api/submit/route.js"
			},
			{
				"id": "createWebhook",
				"label": "Create webhook",
				"method": "POST",
				"path": "/v1/webhooks",
				"description": "posts.published webhook for feeds you follow (key required). Returns {endpoint, secret}",
				"params": [
					{
						"name": "url",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "HTTPS receiver"
					},
					{
						"name": "events",
						"in": "body",
						"type": "json",
						"description": "[\"posts.published\"]"
					},
					{
						"name": "description",
						"in": "body",
						"type": "string",
						"description": "Note"
					}
				],
				"source": "/home/anthony/www/rssamplifier.com/app/apps/web/src/app/api/v1/webhooks/[[...path]]/route.js"
			}
		]
	},
	{
		"id": "ugig",
		"name": "ugig.net",
		"icon": "💼",
		"category": "Work & jobs",
		"url": "https://ugig.net",
		"description": "Gig marketplace for humans and AI agents, paid in crypto",
		"baseUrl": "https://ugig.net/api",
		"auth": {
			"type": "header",
			"header": "X-API-Key",
			"secret": "UGIG_API_KEY",
			"hint": "Create a key at ugig.net/settings/api-keys or POST /api/api-keys. `Authorization: Bearer <key>` also works"
		},
		"actions": [
			{
				"id": "listGigs",
				"label": "Search gigs",
				"method": "GET",
				"path": "/gigs",
				"description": "List or search gigs",
				"params": [
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"description": "Search"
					},
					{
						"name": "listing_type",
						"in": "query",
						"type": "string",
						"description": "hiring | for-hire"
					},
					{
						"name": "category",
						"in": "query",
						"type": "string",
						"description": "Category"
					},
					{
						"name": "skills",
						"in": "query",
						"type": "string",
						"description": "Comma list"
					},
					{
						"name": "budget_min",
						"in": "query",
						"type": "number",
						"description": "Min budget"
					},
					{
						"name": "sort",
						"in": "query",
						"type": "string",
						"description": "Sort"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Page size"
					}
				],
				"source": "https://ugig.net/api/openapi.json (GET /api/gigs)"
			},
			{
				"id": "createGig",
				"label": "Post a gig",
				"method": "POST",
				"path": "/gigs",
				"description": "Create a gig listing",
				"params": [
					{
						"name": "title",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Title"
					},
					{
						"name": "description",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Description"
					},
					{
						"name": "category",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Category"
					},
					{
						"name": "skills_required",
						"in": "body",
						"type": "json",
						"required": true,
						"description": "Array of skills"
					},
					{
						"name": "budget_type",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Budget type"
					},
					{
						"name": "location_type",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "remote, onsite, ..."
					},
					{
						"name": "budget_min",
						"in": "body",
						"type": "number",
						"description": "Min"
					},
					{
						"name": "budget_max",
						"in": "body",
						"type": "number",
						"description": "Max"
					},
					{
						"name": "listing_type",
						"in": "body",
						"type": "string",
						"description": "hiring | for-hire"
					}
				],
				"source": "https://ugig.net/api/openapi.json (POST /api/gigs)"
			},
			{
				"id": "applyToGig",
				"label": "Apply to gig",
				"method": "POST",
				"path": "/applications",
				"description": "Submit an application",
				"params": [
					{
						"name": "gig_id",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Gig"
					},
					{
						"name": "cover_letter",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Cover letter"
					},
					{
						"name": "proposed_rate",
						"in": "body",
						"type": "number",
						"description": "Rate"
					},
					{
						"name": "proposed_timeline",
						"in": "body",
						"type": "string",
						"description": "Timeline"
					}
				],
				"source": "https://ugig.net/api/openapi.json (POST /api/applications)"
			},
			{
				"id": "createPost",
				"label": "Create feed post",
				"method": "POST",
				"path": "/posts",
				"description": "Post to the community feed",
				"params": [
					{
						"name": "content",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Text"
					},
					{
						"name": "url",
						"in": "body",
						"type": "string",
						"description": "Link"
					},
					{
						"name": "post_type",
						"in": "body",
						"type": "string",
						"description": "Type"
					},
					{
						"name": "tags",
						"in": "body",
						"type": "json",
						"description": "Array of tags"
					}
				],
				"source": "https://ugig.net/api/openapi.json (POST /api/posts)"
			},
			{
				"id": "listBounties",
				"label": "List bounties",
				"method": "GET",
				"path": "/bounties",
				"description": "Open bounties",
				"params": [
					{
						"name": "status",
						"in": "query",
						"type": "string",
						"description": "Status"
					},
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"description": "Search"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Page size"
					}
				],
				"source": "https://ugig.net/api/openapi.json (GET /api/bounties)"
			},
			{
				"id": "sendMessage",
				"label": "Send message",
				"method": "POST",
				"path": "/conversations/{id}/messages",
				"description": "Send a DM in a conversation",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Conversation id"
					},
					{
						"name": "content",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Message"
					}
				],
				"source": "https://ugig.net/api/openapi.json (POST /api/conversations/{id}/messages)"
			}
		]
	},
	{
		"id": "myna",
		"name": "myna",
		"icon": "🐦",
		"category": "Social & messaging",
		"url": "https://mynaposter.com",
		"description": "Post once to 36 social networks (self-hosted myna HTTP API). Set the base URL of your own myna API.",
		"baseUrl": "https://myna.example.com",
		"auth": {
			"type": "bearer",
			"secret": "MYNA_API_TOKEN",
			"hint": "MYNA_API_TOKEN you set when running `bun apps/api/src/server.ts` (your own instance; set baseUrl to it). Writes are refused when no token is set"
		},
		"actions": [
			{
				"id": "post",
				"label": "Post now",
				"method": "POST",
				"path": "/v1/post",
				"description": "Publish immediately to all accounts, one network, or an account id",
				"params": [
					{
						"name": "text",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Post text"
					},
					{
						"name": "to",
						"in": "body",
						"type": "string",
						"description": "all | network | network:account | comma list"
					},
					{
						"name": "title",
						"in": "body",
						"type": "string",
						"description": "Title (Reddit, blogs)"
					},
					{
						"name": "extra",
						"in": "body",
						"type": "json",
						"description": "Per-network options, e.g. {subreddit}"
					},
					{
						"name": "thread",
						"in": "body",
						"type": "boolean",
						"description": "Split into a thread"
					},
					{
						"name": "dryRun",
						"in": "body",
						"type": "boolean",
						"description": "Preview only"
					}
				],
				"source": "/home/anthony/src/profullstack/mynaposter/apps/api/src/server.ts:251; PostRequest in apps/api/src/service.ts:49"
			},
			{
				"id": "schedule",
				"label": "Schedule post",
				"method": "POST",
				"path": "/v1/schedule",
				"description": "Queue a post for later",
				"params": [
					{
						"name": "text",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Post text"
					},
					{
						"name": "at",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "When (ISO time)"
					},
					{
						"name": "to",
						"in": "body",
						"type": "string",
						"description": "Targets"
					}
				],
				"source": "/home/anthony/src/profullstack/mynaposter/apps/api/src/server.ts:256; service.ts:113"
			},
			{
				"id": "listAccounts",
				"label": "List accounts",
				"method": "GET",
				"path": "/v1/accounts",
				"description": "Connected accounts",
				"params": [],
				"source": "/home/anthony/src/profullstack/mynaposter/apps/api/src/server.ts:234"
			},
			{
				"id": "listQueue",
				"label": "List queue",
				"method": "GET",
				"path": "/v1/queue",
				"description": "Scheduled posts",
				"params": [],
				"source": "/home/anthony/src/profullstack/mynaposter/apps/api/src/server.ts:235"
			},
			{
				"id": "cancelQueued",
				"label": "Cancel scheduled post",
				"method": "DELETE",
				"path": "/v1/queue/{id}",
				"description": "Remove a queued post",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Queue id"
					}
				],
				"source": "/home/anthony/src/profullstack/mynaposter/apps/api/src/server.ts:261"
			},
			{
				"id": "history",
				"label": "Post history",
				"method": "GET",
				"path": "/v1/history",
				"description": "What was sent",
				"params": [
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Default 50"
					}
				],
				"source": "/home/anthony/src/profullstack/mynaposter/apps/api/src/server.ts:237"
			}
		],
		"baseUrlEditable": true,
		"baseUrlRequired": true
	},
	{
		"id": "smshub",
		"name": "smshub",
		"icon": "📱",
		"category": "Social & messaging",
		"url": "https://smshub.dev",
		"description": "SMS numbers, sending, groups, alerts and inbound-SMS webhooks",
		"baseUrl": "https://smshub.dev/api/v1",
		"auth": {
			"type": "header",
			"header": "X-API-Key",
			"secret": "SMSHUB_API_KEY",
			"hint": "smshub_... key from smshub.dev/settings/api-keys (or Authorization: Bearer smshub_...)"
		},
		"actions": [
			{
				"id": "sendSms",
				"label": "Send SMS",
				"method": "POST",
				"path": "/messages/send",
				"description": "Send one SMS/MMS from your own Twilio or Telnyx number. 10 per minute",
				"params": [
					{
						"name": "to",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "E.164 recipient"
					},
					{
						"name": "message",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Up to 1600 characters"
					},
					{
						"name": "from",
						"in": "body",
						"type": "string",
						"description": "Your number or its id"
					},
					{
						"name": "media_url",
						"in": "body",
						"type": "string",
						"description": "Image URL for MMS"
					}
				],
				"source": "https://smshub.dev/openapi.json (POST /api/v1/messages/send)"
			},
			{
				"id": "getNumberMessages",
				"label": "Get received texts",
				"method": "GET",
				"path": "/numbers/{id}/messages",
				"description": "Texts received on a number, with any OTP pulled out",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Number id"
					},
					{
						"name": "since",
						"in": "query",
						"type": "string",
						"description": "ISO time"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Limit"
					},
					{
						"name": "wait",
						"in": "query",
						"type": "number",
						"description": "Long-poll seconds"
					}
				],
				"source": "https://smshub.dev/openapi.json"
			},
			{
				"id": "sendGroup",
				"label": "Text a group",
				"method": "POST",
				"path": "/groups/{id}/send",
				"description": "Text every member of a group (people who replied STOP are skipped)",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Group id"
					},
					{
						"name": "message",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Up to 1600 characters"
					},
					{
						"name": "from",
						"in": "body",
						"type": "string",
						"description": "Override number"
					}
				],
				"source": "https://smshub.dev/openapi.json"
			},
			{
				"id": "sendAlert",
				"label": "Send alert",
				"method": "POST",
				"path": "/alerts",
				"description": "Text or call your alert phone. Repeats within 10 minutes are sent once",
				"params": [
					{
						"name": "message",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Up to 600 characters"
					},
					{
						"name": "severity",
						"in": "body",
						"type": "string",
						"description": "info | warning | critical (critical always calls)"
					},
					{
						"name": "to",
						"in": "body",
						"type": "string",
						"description": "Recipient"
					}
				],
				"source": "https://smshub.dev/openapi.json"
			},
			{
				"id": "listNumbers",
				"label": "List numbers",
				"method": "GET",
				"path": "/numbers",
				"description": "Your numbers and plan",
				"params": [],
				"source": "https://smshub.dev/openapi.json"
			},
			{
				"id": "createWebhook",
				"label": "Create webhook",
				"method": "POST",
				"path": "/webhooks",
				"description": "Standard Webhooks endpoint, e.g. message.received",
				"params": [
					{
						"name": "url",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "HTTPS URL"
					},
					{
						"name": "events",
						"in": "body",
						"type": "json",
						"description": "[\"message.received\"]"
					},
					{
						"name": "description",
						"in": "body",
						"type": "string",
						"description": "Note"
					}
				],
				"source": "https://smshub.dev/openapi.json"
			}
		]
	},
	{
		"id": "pitworld",
		"name": "pit.world",
		"icon": "🔎",
		"category": "Data & search",
		"url": "https://pit.world",
		"description": "Private web search, Moshpit name resolver and training corpus",
		"baseUrl": "https://pit.world/api",
		"auth": {
			"type": "none",
			"hint": "Search needs no key. Beyond the free 20 pages a day, the corpus is paid by x402 or a CoinPay credit pack"
		},
		"actions": [
			{
				"id": "search",
				"label": "Web search",
				"method": "GET",
				"path": "/search",
				"description": "Private web search",
				"params": [
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"required": true,
						"description": "Query"
					},
					{
						"name": "n",
						"in": "query",
						"type": "number",
						"description": "Result count"
					},
					{
						"name": "t",
						"in": "query",
						"type": "string",
						"description": "web | images | videos | music | live"
					}
				],
				"source": "https://pit.world/api; https://pit.world/llms.txt; live 200"
			},
			{
				"id": "resolve",
				"label": "Resolve Moshpit name",
				"method": "GET",
				"path": "/resolve",
				"description": "Resolve a Moshpit name to its target",
				"params": [
					{
						"name": "name",
						"in": "query",
						"type": "string",
						"required": true,
						"description": "e.g. chovy.hacker"
					}
				],
				"source": "https://pit.world/api; live 200"
			},
			{
				"id": "corpus",
				"label": "Corpus pages",
				"method": "GET",
				"path": "/corpus",
				"description": "Full-page text from the crawl index, keyset paged (20 free a day)",
				"params": [
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"required": true,
						"description": "Comma list = any term"
					},
					{
						"name": "site",
						"in": "query",
						"type": "string",
						"description": "Site"
					},
					{
						"name": "lang",
						"in": "query",
						"type": "string",
						"description": "Language"
					},
					{
						"name": "since",
						"in": "query",
						"type": "string",
						"description": "Since"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "1 to 100"
					},
					{
						"name": "cursor",
						"in": "query",
						"type": "string",
						"description": "next_cursor"
					}
				],
				"source": "https://pit.world/api#corpus"
			},
			{
				"id": "corpusStats",
				"label": "Corpus stats",
				"method": "GET",
				"path": "/corpus/stats",
				"description": "Corpus size. Free",
				"params": [],
				"source": "https://pit.world/api"
			},
			{
				"id": "status",
				"label": "Network status",
				"method": "GET",
				"path": "/status",
				"description": "Service status",
				"params": [],
				"source": "https://pit.world/api"
			}
		]
	},
	{
		"id": "myip",
		"name": "my.ip.pit.world",
		"icon": "🌐",
		"category": "Network",
		"url": "https://my.ip.pit.world",
		"description": "Public IPv4 and IPv6 of the caller, merged",
		"baseUrl": "https://my.ip.pit.world",
		"auth": {
			"type": "none",
			"hint": "No key"
		},
		"actions": [
			{
				"id": "getIp",
				"label": "Get my IP",
				"method": "GET",
				"path": "/",
				"description": "Returns {ip, ipv4, ipv6}",
				"params": [
					{
						"name": "format",
						"in": "query",
						"type": "string",
						"description": "json"
					}
				],
				"source": "live GET https://my.ip.pit.world/?format=json returned {ip, ipv4, ipv6}"
			}
		]
	},
	{
		"id": "botseo",
		"name": "bot.seo",
		"icon": "🤖",
		"category": "Marketing",
		"url": "https://bot.seo.w3bs.org",
		"description": "Bulk-domain SEO autopilot: audit, content plan, AI articles, auto-publish",
		"baseUrl": "https://bot.seo.w3bs.org/api/v1",
		"auth": {
			"type": "bearer",
			"secret": "BOTSEO_API_KEY",
			"hint": "bs_... key: run `key` in the web terminal, `botseo login`, or POST /api/v1/keys while signed in"
		},
		"actions": [
			{
				"id": "addSites",
				"label": "Add domains",
				"method": "POST",
				"path": "/sites",
				"description": "Add domains to audit and plan",
				"params": [
					{
						"name": "domains",
						"in": "body",
						"type": "json",
						"required": true,
						"description": "Array of domains, or a newline-separated string"
					}
				],
				"source": "bot.seo src/server.ts:281 (git show origin/main in /home/anthony/src/profullstack/bot.seo); https://bot.seo.w3bs.org/docs"
			},
			{
				"id": "listSites",
				"label": "List sites",
				"method": "GET",
				"path": "/sites",
				"description": "Sites with status, score and queue ETA",
				"params": [
					{
						"name": "status",
						"in": "query",
						"type": "string",
						"description": "Filter"
					}
				],
				"source": "bot.seo src/server.ts:297; https://bot.seo.w3bs.org/docs"
			},
			{
				"id": "getSite",
				"label": "Get site",
				"method": "GET",
				"path": "/sites/{id}",
				"description": "Profile, audit, settings and plan",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Site id"
					}
				],
				"source": "bot.seo src/server.ts:340"
			},
			{
				"id": "addItem",
				"label": "Add content item",
				"method": "POST",
				"path": "/sites/{id}/items",
				"description": "Add your own article or tool idea",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Site id"
					},
					{
						"name": "kind",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "article | pseo | tool"
					},
					{
						"name": "title",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Title"
					},
					{
						"name": "keyword",
						"in": "body",
						"type": "string",
						"description": "Target keyword"
					},
					{
						"name": "brief",
						"in": "body",
						"type": "string",
						"description": "Brief"
					}
				],
				"source": "bot.seo src/server.ts:409; https://bot.seo.w3bs.org/docs"
			},
			{
				"id": "approveAll",
				"label": "Approve all items",
				"method": "POST",
				"path": "/sites/approve-all",
				"description": "Approve every proposed item on every site",
				"params": [],
				"source": "bot.seo src/server.ts:323"
			},
			{
				"id": "publishItem",
				"label": "Publish item",
				"method": "POST",
				"path": "/items/{id}/publish",
				"description": "Publish a written article now",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Item id"
					}
				],
				"source": "bot.seo src/server.ts:519"
			}
		]
	},
	{
		"id": "nichedb",
		"name": "NicheDB",
		"icon": "🗃️",
		"category": "Data & search",
		"url": "https://nichedb.dev",
		"description": "Open real-time public data (161M items): search, items, feeds, webhooks",
		"baseUrl": "https://nichedb.dev/api/v1",
		"auth": {
			"type": "bearer",
			"secret": "NICHEDB_API_KEY",
			"optional": true,
			"hint": "Reads need no key. Writes and higher limits take an ndb_... key from nichedb.dev settings"
		},
		"actions": [
			{
				"id": "search",
				"label": "Search",
				"method": "GET",
				"path": "/search",
				"description": "Full-text search (narrow it with a collection)",
				"params": [
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"required": true,
						"description": "Query"
					},
					{
						"name": "collection",
						"in": "query",
						"type": "string",
						"description": "games, packages, filings, music, books, space, ..."
					}
				],
				"source": "https://nichedb.dev/docs/api"
			},
			{
				"id": "listItems",
				"label": "List items",
				"method": "GET",
				"path": "/items",
				"description": "Newest items, keyset paged, with tag, date and geo filters",
				"params": [
					{
						"name": "collection",
						"in": "query",
						"type": "string",
						"description": "Collection"
					},
					{
						"name": "source",
						"in": "query",
						"type": "string",
						"description": "Source slug"
					},
					{
						"name": "tags",
						"in": "query",
						"type": "string",
						"description": "e.g. state:in,league:nba"
					},
					{
						"name": "since",
						"in": "query",
						"type": "string",
						"description": "Changed since"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Limit"
					},
					{
						"name": "before",
						"in": "query",
						"type": "string",
						"description": "Cursor"
					}
				],
				"source": "https://nichedb.dev/docs/api"
			},
			{
				"id": "match",
				"label": "Match a name",
				"method": "GET",
				"path": "/match",
				"description": "Match a title, channel or fixture name by trigram similarity",
				"params": [
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"required": true,
						"description": "Name"
					},
					{
						"name": "collection",
						"in": "query",
						"type": "string",
						"description": "Collection"
					},
					{
						"name": "date",
						"in": "query",
						"type": "string",
						"description": "YYYY-MM-DD"
					}
				],
				"source": "https://nichedb.dev/docs/api"
			},
			{
				"id": "feedItems",
				"label": "Feed items",
				"method": "GET",
				"path": "/feeds/{slug}/items",
				"description": "What a feed selects, newest first",
				"params": [
					{
						"name": "slug",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Feed slug"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Limit"
					},
					{
						"name": "before",
						"in": "query",
						"type": "string",
						"description": "Cursor id"
					}
				],
				"source": "https://nichedb.dev/docs/api"
			},
			{
				"id": "createFeed",
				"label": "Create feed",
				"method": "POST",
				"path": "/feeds",
				"description": "Create a feed (key required)",
				"params": [
					{
						"name": "collection",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Collection"
					},
					{
						"name": "name",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Name"
					},
					{
						"name": "q",
						"in": "body",
						"type": "string",
						"description": "Query"
					},
					{
						"name": "tags",
						"in": "body",
						"type": "json",
						"description": "Tags"
					},
					{
						"name": "public",
						"in": "body",
						"type": "boolean",
						"description": "Public"
					}
				],
				"source": "https://nichedb.dev/docs/api"
			},
			{
				"id": "createWebhook",
				"label": "Create webhook",
				"method": "POST",
				"path": "/webhooks",
				"description": "Events such as feed.item.published (key required)",
				"params": [
					{
						"name": "url",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Receiver"
					},
					{
						"name": "events",
						"in": "body",
						"type": "json",
						"description": "e.g. [\"feed.*\"]"
					},
					{
						"name": "description",
						"in": "body",
						"type": "string",
						"description": "Note"
					}
				],
				"source": "https://nichedb.dev/docs/api"
			}
		]
	},
	{
		"id": "crawlproof",
		"name": "CrawlProof",
		"icon": "🕷️",
		"category": "Marketing",
		"url": "https://crawlproof.com",
		"description": "AEO audits, site traffic stats, social posting and ad campaigns",
		"baseUrl": "https://crawlproof.com/api",
		"auth": {
			"type": "bearer",
			"secret": "CRAWLPROOF_TOKEN",
			"hint": "crp_... token from CrawlProof Social > API tokens (also used by the CLI as CRAWLPROOF_TOKEN)"
		},
		"actions": [
			{
				"id": "listSocialAccounts",
				"label": "List social accounts",
				"method": "GET",
				"path": "/sp/v1/accounts",
				"description": "Connected social accounts",
				"params": [],
				"source": "/home/anthony/www/crawlproof.com/app/app/api/sp/v1/accounts/route.ts"
			},
			{
				"id": "publishPost",
				"label": "Publish social post",
				"method": "POST",
				"path": "/sp/v1/posts",
				"description": "Post through a connected account",
				"params": [
					{
						"name": "account_id",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Account uuid"
					},
					{
						"name": "text",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Body"
					},
					{
						"name": "subreddit",
						"in": "body",
						"type": "string",
						"description": "Required for Reddit"
					},
					{
						"name": "title",
						"in": "body",
						"type": "string",
						"description": "Required for Reddit"
					}
				],
				"source": "/home/anthony/www/crawlproof.com/app/app/api/sp/v1/posts/route.ts"
			},
			{
				"id": "listSites",
				"label": "List tracked sites",
				"method": "GET",
				"path": "/tracker/v1/sites",
				"description": "Projects the token can read stats for",
				"params": [],
				"source": "/home/anthony/www/crawlproof.com/app/app/api/tracker/v1/sites/route.ts"
			},
			{
				"id": "getStats",
				"label": "Get traffic stats",
				"method": "GET",
				"path": "/tracker/v1/stats",
				"description": "A project's traffic",
				"params": [
					{
						"name": "site",
						"in": "query",
						"type": "string",
						"description": "Hostname, uuid or name"
					},
					{
						"name": "range",
						"in": "query",
						"type": "string",
						"description": "e.g. 1h, 24h"
					},
					{
						"name": "who",
						"in": "query",
						"type": "string",
						"description": "humans | bots"
					}
				],
				"source": "/home/anthony/www/crawlproof.com/app/app/api/tracker/v1/stats/route.ts"
			},
			{
				"id": "createCampaign",
				"label": "Create ad campaign",
				"method": "POST",
				"path": "/ads/v1/campaigns",
				"description": "Read a landing page, write creatives and save a campaign",
				"params": [
					{
						"name": "url",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Landing page"
					},
					{
						"name": "name",
						"in": "body",
						"type": "string",
						"description": "Name"
					},
					{
						"name": "daily_budget_cents",
						"in": "body",
						"type": "number",
						"description": "Budget"
					},
					{
						"name": "status",
						"in": "body",
						"type": "string",
						"description": "draft to hold"
					}
				],
				"source": "/home/anthony/www/crawlproof.com/app/app/api/ads/v1/campaigns/route.ts"
			},
			{
				"id": "trending",
				"label": "Trending topics",
				"method": "GET",
				"path": "/trending",
				"description": "Trending list. Open, no key",
				"params": [
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Default 50"
					}
				],
				"source": "/home/anthony/www/crawlproof.com/app/app/api/trending/route.ts"
			}
		]
	},
	{
		"id": "threatcrush",
		"name": "ThreatCrush",
		"icon": "🛡️",
		"category": "Security",
		"url": "https://threatcrush.com",
		"description": "IP and domain reputation, URL and code scanning, malware hash lookup, blocklists",
		"baseUrl": "https://threatcrush.com/api",
		"auth": {
			"type": "bearer",
			"secret": "THREATCRUSH_API_KEY",
			"hint": "Free tc_agent_... key from the ThreatCrush dashboard (org > team > agents). X-API-Key or ?key= also accepted"
		},
		"actions": [
			{
				"id": "reputation",
				"label": "IP/domain reputation",
				"method": "GET",
				"path": "/v1/reputation/{indicator}",
				"description": "Verdict for an IP or domain from the community database",
				"params": [
					{
						"name": "indicator",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "IP or domain"
					},
					{
						"name": "org",
						"in": "query",
						"type": "string",
						"description": "Org id (session users)"
					}
				],
				"source": "/home/anthony/www/threatcrush.com/app/apps/web/src/app/api/v1/reputation/[ip]/route.ts; live call without a key returns 401 asking for a key"
			},
			{
				"id": "reputationBulk",
				"label": "Bulk reputation",
				"method": "POST",
				"path": "/v1/reputation/bulk",
				"description": "Many indicators at once",
				"params": [
					{
						"name": "indicators",
						"in": "body",
						"type": "json",
						"required": true,
						"description": "[\"1.2.3.4\",\"evil.example\"]"
					}
				],
				"source": "/home/anthony/www/threatcrush.com/app/apps/web/src/app/api/v1/reputation/bulk/route.ts"
			},
			{
				"id": "scanUrl",
				"label": "Scan URL",
				"method": "POST",
				"path": "/scan",
				"description": "Free URL security scan. No auth",
				"params": [
					{
						"name": "url",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "URL"
					}
				],
				"source": "/home/anthony/www/threatcrush.com/app/apps/web/src/app/api/scan/route.ts"
			},
			{
				"id": "scanCode",
				"label": "Scan code",
				"method": "POST",
				"path": "/scan/code",
				"description": "Run the CLI rule set over submitted code. No auth",
				"params": [
					{
						"name": "content",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Source text"
					},
					{
						"name": "filename",
						"in": "body",
						"type": "string",
						"description": "Filename"
					},
					{
						"name": "language",
						"in": "body",
						"type": "string",
						"description": "Language"
					}
				],
				"source": "/home/anthony/www/threatcrush.com/app/apps/web/src/app/api/scan/code/route.ts"
			},
			{
				"id": "hashLookup",
				"label": "Malware hash lookup",
				"method": "POST",
				"path": "/av/lookup",
				"description": "CrushAV SHA-256 reputation. No auth",
				"params": [
					{
						"name": "hashes",
						"in": "body",
						"type": "json",
						"required": true,
						"description": "Up to 100 lowercase SHA-256"
					}
				],
				"source": "/home/anthony/www/threatcrush.com/app/apps/web/src/app/api/av/lookup/route.ts"
			},
			{
				"id": "blocklist",
				"label": "Get blocklist",
				"method": "GET",
				"path": "/traffic/blocklist.json",
				"description": "Corroborated attacker addresses (key-gated)",
				"params": [],
				"source": "/home/anthony/www/threatcrush.com/app/apps/web/src/app/api/traffic/blocklist.json/route.ts; src/lib/feed-auth.ts"
			}
		]
	},
	{
		"id": "readm3",
		"name": "readm3",
		"icon": "📖",
		"category": "Data & search",
		"url": "https://readm3.com",
		"description": "Extract text from any URL (PDF, HTML, office, EPUB) plus anonymous pastes",
		"baseUrl": "https://readm3.com/api/v1",
		"auth": {
			"type": "bearer",
			"secret": "READM3_TOKEN",
			"optional": true,
			"hint": "No account: 20 reads an hour per address, then 402 with an x402 $1 day pass"
		},
		"actions": [
			{
				"id": "readUrl",
				"label": "Read URL",
				"method": "GET",
				"path": "/read",
				"description": "Text of a document at a URL as JSON (title, kind, pages, chars, text)",
				"params": [
					{
						"name": "url",
						"in": "query",
						"type": "string",
						"required": true,
						"description": "Document URL"
					},
					{
						"name": "maxChars",
						"in": "query",
						"type": "number",
						"description": "Truncate"
					}
				],
				"source": "/home/anthony/www/readm3.com/app/server/read.ts; https://readm3.com/llms.txt; live 200"
			},
			{
				"id": "createPaste",
				"label": "Create paste",
				"method": "POST",
				"path": "/pastes",
				"description": "Anonymous paste behind a secret link",
				"params": [
					{
						"name": "source",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Text"
					},
					{
						"name": "title",
						"in": "body",
						"type": "string",
						"description": "Filename (decides the language)"
					},
					{
						"name": "expiresIn",
						"in": "body",
						"type": "string",
						"description": "1h, 1d, 7d, 30d"
					}
				],
				"source": "/home/anthony/www/readm3.com/app/server/pastes.ts; https://readm3.com/paste"
			},
			{
				"id": "getPaste",
				"label": "Get paste",
				"method": "GET",
				"path": "/pastes/{token}",
				"description": "Paste as JSON",
				"params": [
					{
						"name": "token",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Secret token"
					}
				],
				"source": "https://readm3.com/paste; /home/anthony/www/readm3.com/app/site/server.ts:288"
			},
			{
				"id": "getCode",
				"label": "Open document code",
				"method": "GET",
				"path": "/codes/{code}",
				"description": "A shared document by its six-digit code, read-only",
				"params": [
					{
						"name": "code",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "6 digits"
					}
				],
				"source": "/home/anthony/www/readm3.com/app/server/api.ts:353"
			}
		]
	},
	{
		"id": "logicsrc",
		"name": "LogicSRC OpenOntology",
		"icon": "🧠",
		"category": "Data & search",
		"url": "https://logicsrc.com",
		"description": "OpenOntology reference API: entities, claims, triple-pattern queries",
		"baseUrl": "https://logicsrc.com/api",
		"auth": {
			"type": "bearer",
			"secret": "LOGICSRC_TOKEN",
			"optional": true,
			"hint": "No token = read-only. Curator and agent tokens are deployment-operator only"
		},
		"actions": [
			{
				"id": "listOntologies",
				"label": "List ontologies",
				"method": "GET",
				"path": "/ontologies",
				"description": "Available ontologies",
				"params": [],
				"source": "https://logicsrc.com/api/ontologies/openapi; live 200"
			},
			{
				"id": "listEntities",
				"label": "Search entities",
				"method": "GET",
				"path": "/ontologies/{ontologyId}/entities",
				"description": "List or search entities",
				"params": [
					{
						"name": "ontologyId",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "e.g. ethereum-ecosystem"
					},
					{
						"name": "type",
						"in": "query",
						"type": "string",
						"description": "Entity type"
					},
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"description": "Search"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Limit"
					}
				],
				"source": "https://logicsrc.com/api/ontologies/openapi"
			},
			{
				"id": "getEntity",
				"label": "Get entity",
				"method": "GET",
				"path": "/ontologies/{ontologyId}/entities/{entityId}",
				"description": "Entity and its claims",
				"params": [
					{
						"name": "ontologyId",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Ontology"
					},
					{
						"name": "entityId",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Entity"
					}
				],
				"source": "https://logicsrc.com/api/ontologies/openapi"
			},
			{
				"id": "query",
				"label": "Run query",
				"method": "POST",
				"path": "/ontologies/{ontologyId}/query",
				"description": "Saved or ad-hoc triple-pattern query",
				"params": [
					{
						"name": "ontologyId",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Ontology"
					},
					{
						"name": "savedQuery",
						"in": "body",
						"type": "string",
						"description": "Saved query name"
					},
					{
						"name": "query",
						"in": "body",
						"type": "json",
						"description": "{match:[{subject,predicate,object}], select:[...]}"
					},
					{
						"name": "params",
						"in": "body",
						"type": "json",
						"description": "Query params"
					}
				],
				"source": "https://logicsrc.com/api/ontologies/openapi"
			},
			{
				"id": "listClaims",
				"label": "List claims",
				"method": "GET",
				"path": "/ontologies/{ontologyId}/claims",
				"description": "Claims by subject or predicate",
				"params": [
					{
						"name": "ontologyId",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Ontology"
					},
					{
						"name": "subject",
						"in": "query",
						"type": "string",
						"description": "Subject"
					},
					{
						"name": "predicate",
						"in": "query",
						"type": "string",
						"description": "Predicate"
					},
					{
						"name": "status",
						"in": "query",
						"type": "string",
						"description": "Status"
					}
				],
				"source": "https://logicsrc.com/api/ontologies/openapi"
			}
		]
	},
	{
		"id": "outreachgraph",
		"name": "OutreachGraph",
		"icon": "📨",
		"category": "Marketing",
		"url": "https://outreachgraph.com",
		"description": "AutoGTM outbound: campaigns, lead import, inbox replies, hot leads",
		"baseUrl": "https://outreachgraph.com/api/v1",
		"auth": {
			"type": "header",
			"header": "X-API-Key",
			"secret": "OUTREACHGRAPH_API_KEY",
			"hint": "og_live_... key from outreachgraph.com/settings (Bearer also accepted)"
		},
		"actions": [
			{
				"id": "listCampaigns",
				"label": "List campaigns",
				"method": "GET",
				"path": "/autogtm/campaigns",
				"description": "Campaigns with headline numbers",
				"params": [],
				"source": "https://outreachgraph.com/api/v1/public/openapi.json"
			},
			{
				"id": "importCampaign",
				"label": "Create campaign from leads",
				"method": "POST",
				"path": "/autogtm/campaigns/import",
				"description": "Create a campaign from your own lead list",
				"params": [
					{
						"name": "name",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Campaign name"
					},
					{
						"name": "leads",
						"in": "body",
						"type": "json",
						"required": true,
						"description": "Array of leads"
					},
					{
						"name": "project_id",
						"in": "body",
						"type": "string",
						"description": "Defaults to the first project"
					},
					{
						"name": "instructions",
						"in": "body",
						"type": "string",
						"description": "Instructions"
					},
					{
						"name": "autopilot",
						"in": "body",
						"type": "boolean",
						"description": "Send unattended"
					},
					{
						"name": "consent_basis",
						"in": "body",
						"type": "string",
						"description": "Consent basis"
					}
				],
				"source": "https://outreachgraph.com/api/v1/public/openapi.json"
			},
			{
				"id": "addLeads",
				"label": "Add leads",
				"method": "POST",
				"path": "/autogtm/campaigns/{campaign_id}/leads",
				"description": "Add leads (array or CSV)",
				"params": [
					{
						"name": "campaign_id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Campaign"
					},
					{
						"name": "leads",
						"in": "body",
						"type": "json",
						"description": "Leads"
					},
					{
						"name": "csv",
						"in": "body",
						"type": "string",
						"description": "CSV with a header row"
					}
				],
				"source": "https://outreachgraph.com/api/v1/public/openapi.json"
			},
			{
				"id": "hotLeads",
				"label": "Hot leads",
				"method": "GET",
				"path": "/autogtm/hot-leads",
				"description": "Leads who replied, newest reply first",
				"params": [
					{
						"name": "since",
						"in": "query",
						"type": "string",
						"description": "ISO time"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Limit"
					}
				],
				"source": "https://outreachgraph.com/api/v1/public/openapi.json"
			},
			{
				"id": "replyToLead",
				"label": "Reply to lead",
				"method": "POST",
				"path": "/autogtm/campaigns/{campaign_id}/inbox/{person_id}/reply",
				"description": "Reply in a lead thread",
				"params": [
					{
						"name": "campaign_id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Campaign"
					},
					{
						"name": "person_id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Lead"
					},
					{
						"name": "text",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Reply"
					}
				],
				"source": "https://outreachgraph.com/api/v1/public/openapi.json"
			},
			{
				"id": "campaignAnalytics",
				"label": "Campaign analytics",
				"method": "GET",
				"path": "/autogtm/campaigns/{campaign_id}/analytics",
				"description": "A campaign's numbers",
				"params": [
					{
						"name": "campaign_id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Campaign"
					},
					{
						"name": "since",
						"in": "query",
						"type": "string",
						"description": "ISO time"
					}
				],
				"source": "https://outreachgraph.com/api/v1/public/openapi.json"
			}
		]
	},
	{
		"id": "tipoffwatch",
		"name": "TipoffWatch",
		"icon": "🏀",
		"category": "Data & search",
		"url": "https://tipoffwatch.com",
		"description": "Sports schedules for 924 leagues, plus game webhooks",
		"baseUrl": "https://tipoffwatch.com/api/v1",
		"auth": {
			"type": "bearer",
			"secret": "TIPOFFWATCH_TOKEN",
			"optional": true,
			"hint": "Reads are free with no key. Webhooks use the tok_... key from tipoffwatch.com/settings/webhooks"
		},
		"actions": [
			{
				"id": "listSports",
				"label": "List sports",
				"method": "GET",
				"path": "/sports",
				"description": "Every sport with league counts",
				"params": [],
				"source": "https://tipoffwatch.com/api/v1; /home/anthony/www/tipoffwatch.com/app/apps/web/src/app.js:4972"
			},
			{
				"id": "listLeagues",
				"label": "List leagues",
				"method": "GET",
				"path": "/leagues",
				"description": "Leagues, optionally by sport",
				"params": [
					{
						"name": "sport",
						"in": "query",
						"type": "string",
						"description": "e.g. soccer"
					}
				],
				"source": "/home/anthony/www/tipoffwatch.com/app/apps/web/src/app.js:4977"
			},
			{
				"id": "listEvents",
				"label": "Upcoming games",
				"method": "GET",
				"path": "/events",
				"description": "Upcoming fixtures",
				"params": [
					{
						"name": "league",
						"in": "query",
						"type": "string",
						"description": "e.g. soccer-eng-1"
					},
					{
						"name": "sport",
						"in": "query",
						"type": "string",
						"description": "Sport"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Up to 200"
					}
				],
				"source": "/home/anthony/www/tipoffwatch.com/app/apps/web/src/app.js:4991; live 200"
			},
			{
				"id": "createWebhook",
				"label": "Create webhook",
				"method": "POST",
				"path": "/webhooks",
				"description": "game.starting, game.started, game.final, line.moved (needs tok_ key)",
				"params": [
					{
						"name": "url",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Receiver"
					},
					{
						"name": "events",
						"in": "body",
						"type": "json",
						"description": "Event types"
					}
				],
				"source": "https://tipoffwatch.com/api/v1; /home/anthony/www/tipoffwatch.com/app/packages/webhooks/src/index.js"
			}
		]
	},
	{
		"id": "genrewatch",
		"name": "GenreWatch",
		"icon": "🎬",
		"category": "Data & search",
		"url": "https://genrewatch.com",
		"description": "Upcoming film, TV and music releases by genre",
		"baseUrl": "https://genrewatch.com/api/v1",
		"auth": {
			"type": "none",
			"hint": "No key"
		},
		"actions": [
			{
				"id": "listCategories",
				"label": "List categories",
				"method": "GET",
				"path": "/categories",
				"description": "Categories with counts",
				"params": [],
				"source": "live GET https://genrewatch.com/api/v1 (endpoint index)"
			},
			{
				"id": "listGenres",
				"label": "List genres",
				"method": "GET",
				"path": "/genres",
				"description": "Genres, optionally by category",
				"params": [
					{
						"name": "category",
						"in": "query",
						"type": "string",
						"description": "e.g. tv"
					}
				],
				"source": "https://genrewatch.com/api/v1"
			},
			{
				"id": "listEvents",
				"label": "Upcoming releases",
				"method": "GET",
				"path": "/events",
				"description": "Upcoming events (check time_known before showing a clock time)",
				"params": [
					{
						"name": "genre",
						"in": "query",
						"type": "string",
						"description": "e.g. drama-tv"
					},
					{
						"name": "category",
						"in": "query",
						"type": "string",
						"description": "Category"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Up to 200"
					}
				],
				"source": "https://genrewatch.com/api/v1"
			}
		]
	},
	{
		"id": "bufferoverride",
		"name": "BufferOverride",
		"icon": "❓",
		"category": "Community",
		"url": "https://bufferoverride.com",
		"description": "Technical Q&A for humans and agents, with versioned, independently verified answers",
		"baseUrl": "https://bufferoverride.com/api/v1",
		"auth": {
			"type": "bearer",
			"secret": "BUFFEROVERRIDE_API_KEY",
			"optional": true,
			"hint": "Reads need no key. Writes take a scoped bo_... key from your agents page on bufferoverride.com"
		},
		"actions": [
			{
				"id": "search",
				"label": "Search questions",
				"method": "GET",
				"path": "/search",
				"description": "Full-text search, ranked by bm25",
				"params": [
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"required": true,
						"description": "Query"
					}
				],
				"source": "https://bufferoverride.com/docs/api; live 200"
			},
			{
				"id": "getQuestion",
				"label": "Get question",
				"method": "GET",
				"path": "/questions/{id}",
				"description": "One question with its answers",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Question code"
					}
				],
				"source": "/home/anthony/src/profullstack/bufferoverride/apps/api/src/index.ts:52"
			},
			{
				"id": "listQuestions",
				"label": "Recent questions",
				"method": "GET",
				"path": "/questions",
				"description": "Recent questions",
				"params": [],
				"source": "/home/anthony/src/profullstack/bufferoverride/apps/api/src/index.ts:33"
			},
			{
				"id": "askQuestion",
				"label": "Ask question",
				"method": "POST",
				"path": "/questions",
				"description": "Post a question",
				"params": [
					{
						"name": "title",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Title"
					},
					{
						"name": "body",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Markdown body"
					},
					{
						"name": "tags",
						"in": "body",
						"type": "json",
						"description": "Array of tags"
					}
				],
				"source": "/home/anthony/src/profullstack/bufferoverride/apps/api/src/write.ts:104"
			},
			{
				"id": "answer",
				"label": "Answer question",
				"method": "POST",
				"path": "/questions/{id}/answers",
				"description": "Answer, with the versions it is valid for",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Question"
					},
					{
						"name": "body",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Answer"
					},
					{
						"name": "validFrom",
						"in": "body",
						"type": "string",
						"description": "First version it is valid for"
					},
					{
						"name": "validThrough",
						"in": "body",
						"type": "string",
						"description": "Last version it is valid for"
					}
				],
				"source": "/home/anthony/src/profullstack/bufferoverride/apps/api/src/write.ts:140"
			},
			{
				"id": "verifyAnswer",
				"label": "Record reproduction",
				"method": "POST",
				"path": "/answers/{id}/verify",
				"description": "Record that you reproduced an answer",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Answer"
					},
					{
						"name": "result",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Outcome"
					},
					{
						"name": "environment",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Versions and OS"
					},
					{
						"name": "notes",
						"in": "body",
						"type": "string",
						"description": "Notes"
					}
				],
				"source": "/home/anthony/src/profullstack/bufferoverride/apps/api/src/write.ts:177"
			}
		]
	},
	{
		"id": "hqtui-bbs",
		"name": "HQTUI BBS (tsbb)",
		"icon": "💬",
		"category": "Community",
		"url": "https://bbs.hqtui.com",
		"description": "tsbb bulletin board: forums, topics, replies, search (the same API works on any tsbb board)",
		"baseUrl": "https://bbs.hqtui.com/api/v1",
		"auth": {
			"type": "bearer",
			"secret": "TSBB_TOKEN",
			"optional": true,
			"hint": "tsbb_... token from the device flow (POST /api/v1/device/start, a human approves, then poll /device/poll) or `tsbb login`. Guest reads need no token"
		},
		"actions": [
			{
				"id": "latest",
				"label": "Latest topics",
				"method": "GET",
				"path": "/latest",
				"description": "Recently active topics",
				"params": [
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Up to 100"
					},
					{
						"name": "offset",
						"in": "query",
						"type": "number",
						"description": "Offset"
					}
				],
				"source": "https://bbs.hqtui.com/api/v1/openapi.json"
			},
			{
				"id": "search",
				"label": "Search",
				"method": "GET",
				"path": "/search",
				"description": "Full-text search",
				"params": [
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"required": true,
						"description": "Query"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Limit"
					}
				],
				"source": "https://bbs.hqtui.com/api/v1/openapi.json"
			},
			{
				"id": "getTopic",
				"label": "Get topic",
				"method": "GET",
				"path": "/topics/{id}",
				"description": "A topic and its posts",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Topic id"
					}
				],
				"source": "https://bbs.hqtui.com/api/v1/openapi.json"
			},
			{
				"id": "createTopic",
				"label": "Start topic",
				"method": "POST",
				"path": "/forums/{slug}/topics",
				"description": "Start a topic in a forum",
				"params": [
					{
						"name": "slug",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Forum, e.g. general"
					},
					{
						"name": "title",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Title"
					},
					{
						"name": "body",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Body"
					},
					{
						"name": "format",
						"in": "body",
						"type": "string",
						"description": "markdown | bbcode"
					}
				],
				"source": "https://bbs.hqtui.com/api/v1/openapi.json"
			},
			{
				"id": "reply",
				"label": "Reply",
				"method": "POST",
				"path": "/topics/{id}/posts",
				"description": "Reply to a topic",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Topic"
					},
					{
						"name": "body",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Body"
					},
					{
						"name": "format",
						"in": "body",
						"type": "string",
						"description": "markdown | bbcode"
					}
				],
				"source": "https://bbs.hqtui.com/api/v1/openapi.json"
			},
			{
				"id": "notifications",
				"label": "Notifications",
				"method": "GET",
				"path": "/notifications",
				"description": "Replies, mentions and messages",
				"params": [
					{
						"name": "unread",
						"in": "query",
						"type": "string",
						"description": "1 = unread only"
					}
				],
				"source": "https://bbs.hqtui.com/api/v1/openapi.json"
			}
		]
	},
	{
		"id": "p0dcasters",
		"name": "p0dcasters",
		"icon": "🎙️",
		"category": "Data & search",
		"url": "https://p0dcasters.com",
		"description": "Podcast directory: search shows, read episodes, submit feeds",
		"baseUrl": "https://p0dcasters.com/api",
		"auth": {
			"type": "bearer",
			"secret": "OPENACCESS_TOKEN",
			"optional": true,
			"hint": "No key. Profile edits need an OpenAccess bearer token (openaccess.logicsrc.com, scope openprofile:edit)"
		},
		"actions": [
			{
				"id": "search",
				"label": "Search shows",
				"method": "GET",
				"path": "/search",
				"description": "Search podcasts",
				"params": [
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"required": true,
						"description": "Query"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Limit"
					}
				],
				"source": "https://p0dcasters.com/openapi.json; live 200"
			},
			{
				"id": "getPodcast",
				"label": "Get show",
				"method": "GET",
				"path": "/podcast/{slug}",
				"description": "One show",
				"params": [
					{
						"name": "slug",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Show slug"
					}
				],
				"source": "https://p0dcasters.com/openapi.json"
			},
			{
				"id": "getEpisodes",
				"label": "Get episodes",
				"method": "GET",
				"path": "/episodes/{slug}",
				"description": "A show's episodes, read live from its feed",
				"params": [
					{
						"name": "slug",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Show slug"
					}
				],
				"source": "https://p0dcasters.com/openapi.json"
			},
			{
				"id": "submitShow",
				"label": "Submit show",
				"method": "POST",
				"path": "/submit",
				"description": "Add a show by site or feed URL, or OPML",
				"params": [
					{
						"name": "url",
						"in": "body",
						"type": "string",
						"description": "Feed or site URL"
					},
					{
						"name": "urls",
						"in": "body",
						"type": "json",
						"description": "Array"
					},
					{
						"name": "opml",
						"in": "body",
						"type": "string",
						"description": "OPML"
					},
					{
						"name": "email",
						"in": "body",
						"type": "string",
						"description": "Notify"
					}
				],
				"source": "https://p0dcasters.com/openapi.json"
			},
			{
				"id": "getSubmission",
				"label": "Submission status",
				"method": "GET",
				"path": "/submissions/{id}",
				"description": "State of a submission batch",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Submission id"
					}
				],
				"source": "https://p0dcasters.com/openapi.json"
			}
		]
	},
	{
		"id": "w3bs",
		"name": "W3BS",
		"icon": "🧩",
		"category": "AI & compute",
		"url": "https://w3bs.org",
		"description": "Registry of signed agent resources (prompts, tools, MCP) plus recorded desktop tasks",
		"baseUrl": "https://w3bs.org/api",
		"auth": {
			"type": "bearer",
			"secret": "W3BS_PUBLISHER_TOKEN",
			"optional": true,
			"hint": "Read operations need no auth. Publish and revoke need a registry publisher token"
		},
		"actions": [
			{
				"id": "search",
				"label": "Search registry",
				"method": "POST",
				"path": "/search",
				"description": "Search versioned W3BS resources",
				"params": [
					{
						"name": "query",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Query"
					},
					{
						"name": "type",
						"in": "body",
						"type": "string",
						"description": "prompt, agent, tool, mcp, schema, ..."
					}
				],
				"source": "https://w3bs.org/api (operations list); live 200"
			},
			{
				"id": "resolve",
				"label": "Resolve URI",
				"method": "POST",
				"path": "/resolve",
				"description": "Resolve a w3bs:// URI to its manifest and verification state",
				"params": [
					{
						"name": "uri",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "w3bs:// URI"
					}
				],
				"source": "https://w3bs.org/api"
			},
			{
				"id": "verify",
				"label": "Verify manifest",
				"method": "POST",
				"path": "/verify",
				"description": "Check the signature against pinned publisher keys and revocations",
				"params": [
					{
						"name": "uri",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "URI"
					}
				],
				"source": "https://w3bs.org/api"
			},
			{
				"id": "run",
				"label": "Render template",
				"method": "POST",
				"path": "/run",
				"description": "Deterministic template runtime. Renders instructions; never calls a model",
				"params": [
					{
						"name": "uri",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "URI"
					},
					{
						"name": "inputs",
						"in": "body",
						"type": "json",
						"required": true,
						"description": "Template inputs"
					},
					{
						"name": "consent",
						"in": "body",
						"type": "boolean",
						"required": true,
						"description": "Must be true"
					}
				],
				"source": "https://w3bs.org/api"
			},
			{
				"id": "listTasks",
				"label": "List tasks",
				"method": "GET",
				"path": "/v1/tasks",
				"description": "Published desktop tasks and workflows",
				"params": [],
				"source": "https://w3bs.org/api/v1/tasks; live 200"
			}
		]
	},
	{
		"id": "agenticjobs",
		"name": "Agentic Jobs",
		"icon": "🧑‍💻",
		"category": "Work & jobs",
		"url": "https://agenticjobs.work",
		"description": "Agent-friendly job board: search jobs, post jobs, apply",
		"baseUrl": "https://agenticjobs.pwa.pit.world/api/v1",
		"auth": {
			"type": "bearer",
			"secret": "AGENTICJOBS_TOKEN",
			"optional": true,
			"hint": "Reads need no credentials. Writes need a token from the device flow (myna's `agenticjobs` login does this)"
		},
		"actions": [
			{
				"id": "searchJobs",
				"label": "Search jobs",
				"method": "GET",
				"path": "/jobs",
				"description": "Search the board",
				"params": [
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"description": "Query"
					},
					{
						"name": "workplace",
						"in": "query",
						"type": "string",
						"description": "remote, ..."
					},
					{
						"name": "employmentType",
						"in": "query",
						"type": "string",
						"description": "Type"
					},
					{
						"name": "seniority",
						"in": "query",
						"type": "string",
						"description": "Seniority"
					},
					{
						"name": "tag",
						"in": "query",
						"type": "string",
						"description": "Tag"
					},
					{
						"name": "salaryMin",
						"in": "query",
						"type": "number",
						"description": "Min salary"
					},
					{
						"name": "limit",
						"in": "query",
						"type": "number",
						"description": "Limit"
					}
				],
				"source": "https://agenticjobs.pwa.pit.world/api/v1/openapi.json; live 200"
			},
			{
				"id": "getJob",
				"label": "Get job",
				"method": "GET",
				"path": "/jobs/{slug}",
				"description": "One job",
				"params": [
					{
						"name": "slug",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Job slug"
					}
				],
				"source": "https://agenticjobs.pwa.pit.world/api/v1/openapi.json"
			},
			{
				"id": "postJob",
				"label": "Post job",
				"method": "POST",
				"path": "/jobs",
				"description": "Post a job (a draft unless publish is true)",
				"params": [
					{
						"name": "org",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Employer slug"
					},
					{
						"name": "title",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Title"
					},
					{
						"name": "description",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Markdown"
					},
					{
						"name": "publish",
						"in": "body",
						"type": "boolean",
						"description": "Publish now"
					},
					{
						"name": "agentPolicy",
						"in": "body",
						"type": "string",
						"description": "Agent policy"
					}
				],
				"source": "https://agenticjobs.pwa.pit.world/api/v1/openapi.json"
			},
			{
				"id": "listCandidates",
				"label": "List candidates",
				"method": "GET",
				"path": "/candidates",
				"description": "Published resumes",
				"params": [],
				"source": "https://agenticjobs.pwa.pit.world/api/v1/openapi.json"
			},
			{
				"id": "postUpdate",
				"label": "Post update",
				"method": "POST",
				"path": "/updates",
				"description": "Post an update",
				"params": [
					{
						"name": "body",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Text"
					},
					{
						"name": "link",
						"in": "body",
						"type": "string",
						"description": "Link"
					},
					{
						"name": "org",
						"in": "body",
						"type": "string",
						"description": "Post as this employer"
					}
				],
				"source": "https://agenticjobs.pwa.pit.world/api/v1/openapi.json"
			}
		]
	},
	{
		"id": "c0upons",
		"name": "c0upons",
		"icon": "🏷️",
		"category": "Data & search",
		"url": "https://c0upons.com",
		"description": "Community coupon codes: search, stores, submit, reveal hidden codes",
		"baseUrl": "https://c0upons.pwa.pit.world/api",
		"auth": {
			"type": "none",
			"hint": "No auth"
		},
		"actions": [
			{
				"id": "search",
				"label": "Search coupons",
				"method": "GET",
				"path": "/search",
				"description": "Search titles, codes and stores",
				"params": [
					{
						"name": "q",
						"in": "query",
						"type": "string",
						"required": true,
						"description": "Query"
					}
				],
				"source": "https://c0upons.pwa.pit.world/docs#api; live 200"
			},
			{
				"id": "listCoupons",
				"label": "List coupons",
				"method": "GET",
				"path": "/coupons",
				"description": "All coupons by votes",
				"params": [],
				"source": "https://c0upons.pwa.pit.world/docs#api"
			},
			{
				"id": "getStore",
				"label": "Get store",
				"method": "GET",
				"path": "/stores/{slug}",
				"description": "A store and its coupons",
				"params": [
					{
						"name": "slug",
						"in": "path",
						"type": "string",
						"required": true,
						"description": "Store slug"
					}
				],
				"source": "https://c0upons.pwa.pit.world/docs#api"
			},
			{
				"id": "submitCoupon",
				"label": "Submit coupon",
				"method": "POST",
				"path": "/coupons",
				"description": "Add a coupon",
				"params": [
					{
						"name": "store_id",
						"in": "body",
						"type": "number",
						"required": true,
						"description": "Store"
					},
					{
						"name": "title",
						"in": "body",
						"type": "string",
						"required": true,
						"description": "Title"
					},
					{
						"name": "code",
						"in": "body",
						"type": "string",
						"description": "Code"
					},
					{
						"name": "discount",
						"in": "body",
						"type": "string",
						"description": "e.g. 20%"
					}
				],
				"source": "https://c0upons.pwa.pit.world/docs#api"
			},
			{
				"id": "revealCode",
				"label": "Reveal code",
				"method": "POST",
				"path": "/coupons/{id}/reveal",
				"description": "Open the deal page in a browser and pull out the hidden code (up to a minute)",
				"params": [
					{
						"name": "id",
						"in": "path",
						"type": "number",
						"required": true,
						"description": "Coupon id"
					}
				],
				"source": "https://c0upons.pwa.pit.world/docs#api"
			}
		]
	}
];
