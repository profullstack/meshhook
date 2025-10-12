# Dark Mode Implementation

## Overview
MeshHook supports dark mode with automatic persistence across sessions and devices.

## Usage
- Click the moon/sun icon in the header to toggle
- Theme preference is saved locally and synced to your account

## For Developers
- Theme colors are defined in `static/styles/themes.css`
- Theme state is managed in `src/lib/stores/theme.js`
- Use CSS variables for all colors in components

## CSS Variables
See `static/styles/themes.css` for the complete list of theme variables.