<script>
	/**
	 * Dynamic form field component that renders based on JSON schema
	 * Supports: string, number, boolean, select, textarea, secret
	 */

	let {
		field,
		value = $bindable(''),
		error = '',
		disabled = false,
		secrets = []
	} = $props();

	// Determine field type from schema
	const fieldType = $derived(() => {
		if (field.format === 'secret') return 'secret';
		if (field.format === 'textarea') return 'textarea';
		if (field.enum) return 'select';
		if (field.type === 'boolean') return 'checkbox';
		if (field.type === 'number' || field.type === 'integer') return 'number';
		return 'text';
	});

	const type = fieldType();
</script>

<div class="form-field" class:has-error={error}>
	<label for={field.name}>
		{field.title || field.name}
		{#if field.required}
			<span class="required">*</span>
		{/if}
	</label>

	{#if field.description}
		<p class="description">{field.description}</p>
	{/if}

	{#if type === 'textarea'}
		<textarea
			id={field.name}
			bind:value
			placeholder={field.placeholder || ''}
			{disabled}
			rows={field.rows || 4}
		></textarea>
	{:else if type === 'select'}
		<select id={field.name} bind:value {disabled}>
			<option value="">Select {field.title || field.name}</option>
			{#each field.enum as option}
				<option value={option}>{option}</option>
			{/each}
		</select>
	{:else if type === 'checkbox'}
		<label class="checkbox-label">
			<input type="checkbox" id={field.name} bind:checked={value} {disabled} />
			<span>{field.checkboxLabel || 'Enable'}</span>
		</label>
	{:else if type === 'secret'}
		<select id={field.name} bind:value {disabled}>
			<option value="">Select secret</option>
			{#each secrets as secret}
				<option value={secret.id}>{secret.name}</option>
			{/each}
		</select>
	{:else if type === 'number'}
		<input
			type="number"
			id={field.name}
			bind:value
			placeholder={field.placeholder || ''}
			min={field.minimum}
			max={field.maximum}
			step={field.type === 'integer' ? 1 : 'any'}
			{disabled}
		/>
	{:else}
		<input
			type="text"
			id={field.name}
			bind:value
			placeholder={field.placeholder || ''}
			{disabled}
		/>
	{/if}

	{#if error}
		<p class="error-message">{error}</p>
	{/if}
</div>

<style>
	.form-field {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
		font-size: 0.875rem;
	}

	.required {
		color: #e53e3e;
		margin-left: 0.25rem;
	}

	.description {
		margin: 0 0 0.5rem 0;
		font-size: 0.75rem;
		color: #666;
		line-height: 1.4;
	}

	input[type='text'],
	input[type='number'],
	textarea,
	select {
		width: 100%;
		padding: 0.625rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: inherit;
		transition: border-color 0.2s;
	}

	input:focus,
	textarea:focus,
	select:focus {
		outline: none;
		border-color: #4075a6;
	}

	input:disabled,
	textarea:disabled,
	select:disabled {
		background: #f5f5f5;
		cursor: not-allowed;
	}

	textarea {
		resize: vertical;
		min-height: 80px;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-weight: normal;
	}

	.checkbox-label input[type='checkbox'] {
		width: auto;
		cursor: pointer;
	}

	.has-error input,
	.has-error textarea,
	.has-error select {
		border-color: #e53e3e;
	}

	.error-message {
		margin: 0.5rem 0 0 0;
		font-size: 0.75rem;
		color: #e53e3e;
	}
</style>