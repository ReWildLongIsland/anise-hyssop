Pull the latest code from GitHub and orient for the session.

**Git pull:**
```!
cd "$(git -C "C:/Users/raju/Desktop/Code" rev-parse --show-toplevel 2>/dev/null || echo "C:/Users/raju/Desktop/Code")" && git pull
```

**Local changes (if any):**
```!
cd "$(git -C "C:/Users/raju/Desktop/Code" rev-parse --show-toplevel 2>/dev/null || echo "C:/Users/raju/Desktop/Code")" && git status --short
```

**Recent commits:**
```!
cd "$(git -C "C:/Users/raju/Desktop/Code" rev-parse --show-toplevel 2>/dev/null || echo "C:/Users/raju/Desktop/Code")" && git log --oneline -5
```

**PLAN.md:**
```!
cat "C:/Users/raju/Desktop/Code/PLAN.md"
```

Based on all of the above:
1. Summarise what was pulled (new commits, key file changes) — or confirm already up to date
2. State the current active phase and its status from the Quick Status table
3. List the exact next steps from PLAN.md for the current phase
4. Flag any uncommitted local changes that need attention before starting
5. Confirm the session is ready and tell me what to work on first
