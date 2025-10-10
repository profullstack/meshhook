<script>
	import MaskedInput from './MaskedInput.svelte';

	/**
	 * Secret modal for creating/editing secrets
	 */

	let {
		secret = null,
		projects = [],
		isOpen = $bindable(false),
		onSave
	} = $props();

	const isEdit = $derived(!!secret);

	let formData = $state({
		name: '',
		value: '',
		project_id: '',
		description: ''
	});

	let saving = $state(false);

	// Initialize form when secret changes
	$effect(() => {
		if (secret) {
			formData = {
				name: secret.name || '',
				value: secret.value || '',
				project_id: secret.project_id || '',
				description: secret.description || ''
			};
		} else {
			formData = {
				name: '',
				value: '',
				project_id: projects[0]?.id || '',
				description: ''
			};
		}
	});

	async function handleSave() {
		if (!formData.name || !formData.value) {
			alert('Name and value are required');
			return;
		}

		try {
			saving = true;
			await onSave?.(formData);
			close();
		} catch (error) {
			alert(`Error saving secret: ${error.message}`);
		} finally {
			saving = false;
		}
	}

	function close() {
		isOpen = false;
	}

	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			close();
		}
	}
</script>

{#if isOpen}
	<div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
		<div class="modal" role="dialog" aria-modal="true">
			<div class="modal-header">
				<h2>{isEdit ? 'Edit Secret' : 'Create Secret'}</h2>
				<button class="close-button" onclick={close} aria-label="Close">×</button>
			</div>

			<div class="modal-body">
				<form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
					<div class="form-group">
						<label for="name">Secret Name *</label>
						<input
							id="name"
							type="text"
							bind:value={formData.name}
							placeholder="API_KEY"
							required
							disabled={saving || isEdit}
						/>
						<p class="help-text">Unique identifier for this secret</p>
					</div>

					<div class="form-group">
						<label for="value">Secret Value *</label>
						<MaskedInput bind:value={formData.value} placeholder="Enter secret value" disabled={saving} />
						<p class="help-text">The encrypted value will be stored securely</p>
					</div>

					<div class="form-group">
						<label for="project">Project *</label>
						<select id="project" bind:value={formData.project_id} required disabled={saving}>
							<option value="">Select project</option>
							{#each projects as project}
								<option value={project.id}>{project.name}</option>
							{/each}
						</select>
						<p class="help-text">Scope this secret to a specific project</p>
					</div>

					<div class="form-group">
						<label for="description">Description</label>
						<textarea
							id="description"
							bind:value={formData.description}
							placeholder="Optional description..."
							rows="3"
							disabled={saving}
						></textarea>
					</div>

					<div class="modal-actions">
						<button type="button" class="btn-secondary" onclick={close} disabled={saving}>
							Cancel
						</button>
						<button type="submit" class="btn-primary" disabled={saving}>
							{saving ? 'Saving...' : isEdit ? 'Update Secret' : 'Create Secret'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #333;
	}

	.close-button {
		background: none;
		border: none;
		font-size: 2rem;
		line-height: 1;
		color: #666;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.close-button:hover {
		background: #f5f5f5;
		color: #333;
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
		font-size: 0.875rem;
	}

	input[type='text'],
	select,
	textarea {
		width: 100%;
		padding: 0.625rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: inherit;
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: #4075a6;
	}

	input:disabled,
	select:disabled,
	textarea:disabled {
		background: #f5f5f5;
		cursor: not-allowed;
	}

	textarea {
		resize: vertical;
	}

	.help-text {
		margin: 0.5rem 0 0 0;
		font-size: 0.75rem;
		color: #666;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		padding-top: 1rem;
		border-top: 1px solid #e0e0e0;
	}

	button {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background: var(--color-theme-1);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-theme-2);
	}

	.btn-secondary {
		background: white;
		border: 1px solid #ddd;
		color: #333;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f5f5f5;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>