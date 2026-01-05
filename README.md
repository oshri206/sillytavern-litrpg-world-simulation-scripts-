# Valdris-Living-World

A SillyTavern extension that simulates a living world for Valdris: ambient Vex notices, rumors, economy, NPC memory, festivals, encounters, titles, storylets, jobs, journal summaries, and weather.

## Structure
- `manifest.json` — extension manifest.
- `src/` — extension source code.
- `src/prompts/` — prompt templates and example outputs.
- `src/schemas/` — JSON Schemas for stored data.
- `tests/` — minimal unit tests.

## Development
This extension is written in vanilla JavaScript (ES modules) with small helper utilities.

### Run tests
```bash
npm test
```

## Demo
Use the **Seed Valdris Living World Demo** command in SillyTavern to seed data and run a 7-day simulation. It prints notable events to the console and fills the UI panels.
