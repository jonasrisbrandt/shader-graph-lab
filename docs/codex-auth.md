# Codex Auth Toggle Script (Windows)

This documents how to use the PowerShell setup script at
`C:\SourceCode\scripts\setup_codex_auth.ps1`.

## What it does
- Creates `%USERPROFILE%\bin` and adds it to your user `PATH`.
- Writes a `codex-run` wrapper (`.ps1` + `.cmd`) so you can switch auth modes per command.
- Stores your API key in `%LOCALAPPDATA%\codex\api-key`.

## One-time setup
Run the setup script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\SourceCode\scripts\setup_codex_auth.ps1
```

Then restart your terminal so the `PATH` update is picked up.

## Usage
Device login (no API key):

```powershell
codex-run device -- chat "..."
```

API key:

```powershell
codex-run api -- chat "..."
```

Notes:
- Device login must already be completed once via `codex auth login`.
- `codex-run` only sets `OPENAI_API_KEY` for that invocation; it does not change global env vars.

## Files and locations
- Wrapper script: `%USERPROFILE%\bin\codex-run.ps1`
- Wrapper command: `%USERPROFILE%\bin\codex-run.cmd`
- API key file: `%LOCALAPPDATA%\codex\api-key`
