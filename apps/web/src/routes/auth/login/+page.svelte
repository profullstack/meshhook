<script>
	import { createClient } from '$lib/supabase.js';
	import { goto } from '$app/navigation';

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

			goto('/workflows');
		} catch (err) {
			error = err.message;
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

			error = 'Check your email for the confirmation link!';
		} catch (err) {
			error = err.message;
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
		min-height: 100vh;
		padding: 2rem;
	}

	.auth-card {
		background: white;
		padding: 3rem;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		max-width: 400px;
		width: 100%;
	}

	h1 {
		margin-bottom: 2rem;
		font-size: 1.8rem;
		text-align: center;
	}

	.error-message {
		padding: 1rem;
		margin-bottom: 1rem;
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 4px;
		color: #c33;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
	}

	input:focus {
		outline: none;
		border-color: var(--color-theme-1);
	}

	input:disabled {
		background: #f5f5f5;
		cursor: not-allowed;
	}

	.button-group {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
	}

	button {
		flex: 1;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	button.primary {
		background: var(--color-theme-1);
		color: white;
	}

	button.primary:hover:not(:disabled) {
		background: var(--color-theme-2);
	}

	button.secondary {
		background: white;
		color: var(--color-theme-1);
		border: 1px solid var(--color-theme-1);
	}

	button.secondary:hover:not(:disabled) {
		background: var(--color-bg-2);
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.help-text {
		margin-top: 1.5rem;
		text-align: center;
		color: #666;
		font-size: 0.9rem;
	}
</style>