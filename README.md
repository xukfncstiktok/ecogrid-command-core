# EcoGrid Command Core

take files from https://github.com/xukfncstiktok/elevate-your-vision Upgrade EcoGrid AI into an autonomous, command-driven simulation engine by implementing the following three core systems without breaking the existing UI layout or Three.js globe:

1. Autonomous AI Agent Mode (Toggle):

   - Add an "Auto-AI Command Override" toggle switch to the top header bar.

   - When enabled, a background heuristic loop runs every 4 seconds to evaluate all active regional threats (e.g., Amazon Basin, Great Barrier Reef).

   - The AI automatically selects the optimal countermeasure matching the region's dominant threat, deducts grid credits, plays a glowing vector line flash on the 3D Earth model, and automatically initiates recovery.

2. Dynamic Trend Line & Integrity Math:

   - Make the "Global Integrity" trend chart and score dynamically reactive to actions. When countermeasures are deployed (either manually or via Autonomous AI), the trend line must instantly calculate a positive deflection curve, shifting from red/critical downward trajectories to rising green stabilization vectors.

3. Interactive CLI Command Terminal:

   - Add a sleek, collapsible hacker-style command-line input dock at the bottom of the screen.

   - Implement a simple string parser supporting commands like: `deploy swarm <sector_id>`, `status --global`, `override --auto=true`, and `clear`. Typing these commands must execute the respective dashboard actions directly.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b87813ed-502b-49bb-9684-06817fd26c9b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
