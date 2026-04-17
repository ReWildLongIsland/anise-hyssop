Wrap up the current work session by updating the plan, committing, and pushing.

First, run these commands to gather context:

1. Run `git -C "C:/Users/raju/Desktop/Code/Anise Hyssop" diff --stat HEAD` to see what changed this session
2. Run `git -C "C:/Users/raju/Desktop/Code/Anise Hyssop" status --short` to see untracked/modified files
3. Run `git -C "C:/Users/raju/Desktop/Code/plant-sale" diff --stat HEAD` to see what changed in plant-sale
4. Run `git -C "C:/Users/raju/Desktop/Code/plant-sale" status --short` to see untracked/modified files in plant-sale
5. Read the file `C:/Users/raju/Desktop/Code/Anise Hyssop/PLAN.md`

Then do the following steps IN ORDER — do not skip any:

1. **Review the diff** to understand everything that was built or changed this session.

2. **Update PLAN.md** (anise-hyssop only) with accurate current state:
   - In the Quick Status table: update the Status and date for any phase that progressed or completed
   - In the active phase section: check off completed items, update "Next steps" to show where the next session should pick up
   - In the Change Log: add a row (newest first) for any significant decisions, completions, or deviations from the plan
   - Do NOT remove or rewrite history — only add and update

3. **Stage everything in anise-hyssop:** `git -C "C:/Users/raju/Desktop/Code/Anise Hyssop" add .`

4. **Commit anise-hyssop** with a clear message summarising what was built:
   - Format: `Phase X: short description of what was done`
   - Include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

5. **Push anise-hyssop:** `git -C "C:/Users/raju/Desktop/Code/Anise Hyssop" push`

6. **If plant-sale has changes:** stage, commit (same format), and push from `C:/Users/raju/Desktop/Code/plant-sale`

7. **Confirm** by running `git log --oneline -3` and `git status` on both repos, then tell me:
   - What was committed
   - That the other machine can `git pull` to continue
   - What the next session should start with
