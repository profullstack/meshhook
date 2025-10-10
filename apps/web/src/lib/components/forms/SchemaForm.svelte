<script>
	import FormField from './FormField.svelte';

	/**
	 * Dynamic form generator from JSON schema
	 * Validates and manages form state
	 */

	let {
		schema,
		values = $bindable({}),
		errors = $bindable({}),
		secrets = [],
		onSubmit,
		submitLabel = 'Save',
		disabled = false
	} = $props();

	// Initialize values from schema defaults
	$effect(() => {
		if (schema?.properties) {
			Object.entries(schema.properties).forEach(([key, field]) => {
				if (values[key] === undefined && field.default !== undefined) {
					values[key] = field.default;
				}
			});
		}
	});

	// Validate a single field
	function validateField(name, value, field) {
		const errs = [];

		// Required validation
		if (field.required && !value) {
			errs.push(`${field.title || name} is required`);
		}

		// Type validation
		if (value) {
			if (field.type === 'number' || field.type === 'integer') {
				const num = Number(value);
				if (isNaN(num)) {
					errs.push('Must be a valid number');
				} else {
					if (field.minimum !== undefined && num < field.minimum) {
						errs.push(`Must be at least ${field.minimum}`);
					}
					if (field.maximum !== undefined && num > field.maximum) {
						errs.push(`Must be at most ${field.maximum}`);
					}
				}
			}

			if (field.minLength && value.length < field.minLength) {
				errs.push(`Must be at least ${field.minLength} characters`);
			}
			if (field.maxLength && value.length > field.maxLength) {
				errs.push(`Must be at most ${field.maxLength} characters`);
			}

			if (field.pattern) {
				const regex = new RegExp(field.pattern);
				if (!regex.test(value)) {
					errs.push(field.patternMessage || 'Invalid format');
				}
			}
		}

		return errs.length > 0 ? errs.join(', ') : '';
	}

	// Validate all fields
	function validateAll() {
		const newErrors = {};
		let isValid = true;

		if (schema?.properties) {
			Object.entries(schema.properties).forEach(([name, field]) => {
				const error = validateField(name, values[name], field);
				if (error) {
					newErrors[name] = error;
					isValid = false;
				}
			});
		}

		errors = newErrors;
		return isValid;
	}

	// Handle form submission
	function handleSubmit(event) {
		event.preventDefault();

		if (validateAll()) {
			onSubmit?.(values);
		}
	}

	// Handle field change with validation
	function handleFieldChange(name, field) {
		errors[name] = validateField(name, values[name], field);
	}
</script>

<form onsubmit={handleSubmit} class="schema-form">
	{#if schema?.properties}
		{#each Object.entries(schema.properties) as [name, field]}
			<FormField
				field={{ ...field, name, required: schema.required?.includes(name) }}
				bind:value={values[name]}
				error={errors[name]}
				{secrets}
				{disabled}
				onchange={() => handleFieldChange(name, field)}
			/>
		{/each}
	{/if}

	<div class="form-actions">
		<button type="submit" class="btn-primary" {disabled}>
			{submitLabel}
		</button>
	</div>
</form>

<style>
	.schema-form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-actions {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e0e0e0;
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
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
		background: var(--color-theme-1, #ff3e00);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-theme-2, #4075a6);
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>