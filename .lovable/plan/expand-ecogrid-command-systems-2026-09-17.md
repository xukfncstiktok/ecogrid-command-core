# Expand EcoGrid Command Systems

## Goal
Keep the current dashboard and globe intact while making the page more compact, expanding the command deck from 4 to 24 actions, and showing each deployment as an animated 3D operation on Earth.

## Changes
- Constrain the telemetry feed to a compact fixed-height viewport with internal scrolling so new events never stretch the page.
- Add 20 distinct climate countermeasures across forests, energy, water, oceans, carbon, fire, and polar protection.
- Give every action its own cost, cooldown, strength, threat matching, terminal alias, and deck card.
- Keep the 24-action command deck compact with a fixed-height scrollable grid rather than adding a very tall section.
- Expand terminal help and parsing so every new action can be deployed with `deploy <action> <sector_id>`.
- Pass the deployed action type into the globe animation.
- Replace the single generic strike with action-specific 3D deployment scenes: animated drone formations, orbital hardware, forest growth, energy arrays, cloud/rain effects, marine barriers, carbon towers, and related miniature operations attached to the target region.
- Preserve manual deployment, Auto-AI selection, credit deductions, recovery math, selection, and the existing globe controls.

## Validation
- Check all 24 deck actions render and remain usable inside the compact panel.
- Run terminal deployments for multiple new action types and confirm the correct action is logged and charged.
- Capture the live globe during deployments to confirm visible 3D models animate at the selected region.
- Verify the telemetry feed stays bounded on desktop and mobile, and check for browser errors.

## Technical details
- Extend the intervention identifier union and cooldown initialization/update logic for all actions.
- Change the deployment signal from region-only to region plus intervention ID.
- Build short-lived procedural Three.js deployment groups and dispose their geometry/material resources after each animation.
- Keep all animation frame-rate independent and limit active deployment scenes to protect rendering performance.
