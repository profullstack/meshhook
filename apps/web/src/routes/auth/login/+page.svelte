<script>
	import { createClient } from '$lib/supabase.js';
	import { goto } from '$app/navigation';
	import { trackSignIn, trackSignUp, trackError } from '$lib/utils/analytics.js';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	const supabase = createClient();

	async function handleLogin() {
		try {
			loading = true;
			error = '';

			const { data, error: signInError } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (signInError) throw signInError;

			// Track successful sign in
			trackSignIn({ method: 'email' });

			goto('/workflows');
		} catch (err) {
			error = err.message;
			// Track sign in error
			trackError({ message: err.message, context: 'sign_in' });
		} finally {
			loading = false;
		}
	}

	async function handleSignUp() {
		try {
			loading = true;
			error = '';

			const { data, error: signUpError } = await supabase.auth.signUp({
				email,
				password
			});

			if (signUpError) throw signUpError;

			// Track successful sign up
			trackSignUp({ method: 'email' });

			error = 'Check your email for the confirmation link!';
		} catch (err) {
			error = err.message;
			// Track sign up error
			trackError({ message: err.message, context: 'sign_up' });
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - MeshHook</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<h1>Sign In to MeshHook</h1>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
			<div class="form-group">
				<label for="email">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="you@example.com"
					required
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					placeholder="••••••••"
					required
					disabled={loading}
				/>
			</div>

			<div class="button-group">
				<button type="submit" class="primary" disabled={loading}>
					{loading ? 'Signing in...' : 'Sign In'}
				</button>
				<button type="button" class="secondary" onclick={handleSignUp} disabled={loading}>
					Sign Up
				</button>
			</div>
		</form>

		<p class="help-text">
			Don't have an account? Click "Sign Up" to create one.
		</p>
	</div>
</div>

<style>
	.auth-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: calc(100vh - 64px);
		padding: 2rem;
		background-color: var(--color-bg-secondary);
	}

	.auth-card {
		background-color: var(--color-card-bg);
		padding: 2.5rem;
		border-radius: 12px;
		box-shadow: var(--shadow-lg);
		border: 1px solid var(--color-card-border);
		max-width: 420px;
		width: 100%;
	}

	h1 {
		margin-bottom: 2rem;
		font-size: 1.75rem;
		font-weight: 600;
		text-align: center;
		color: var(--color-text-primary);
	}

	.error-message {
		padding: 0.875rem 1rem;
		margin-bottom: 1.5rem;
		background-color: var(--color-error-bg);
		border: 1px solid var(--color-error);
		border-radius: 8px;
		color: var(--color-error);
		font-size: 0.875rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--color-text-primary);
	}

	input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-input-border);
		border-radius: 8px;
		font-size: 1rem;
		background-color: var(--color-input-bg);
		color: var(--color-text-primary);
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
	}

	input::placeholder {
		color: var(--color-text-tertiary);
	}

	input:focus {
		outline: none;
		border-color: var(--color-input-focus);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	input:disabled {
		background-color: var(--color-input-disabled);
		color: var(--color-text-tertiary);
		cursor: not-allowed;
	}

	.button-group {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	button {
		flex: 1;
		padding: 0.75rem 1.25rem;
		border: none;
		border-radius: 8px;
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	button.primary {
		background-color: var(--color-button-primary);
		color: var(--color-text-inverse);
	}

	button.primary:hover:not(:disabled) {
		background-color: var(--color-button-primary-hover);
	}

	button.secondary {
		background-color: var(--color-card-bg);
		color: var(--color-primary);
		border: 1px solid var(--color-primary);
	}

	button.secondary:hover:not(:disabled) {
		background-color: var(--color-bg-hover);
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.help-text {
		margin-top: 1.5rem;
		text-align: center;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}
</style>