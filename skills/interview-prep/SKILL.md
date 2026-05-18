# Skill: Interview Prep

Invoke this skill when the user says anything like:
- "prep me for my interview with [name/company]"
- "interview tomorrow with [name]"
- "prep for [company]"
- "let's prep for [name]"
- "interview prep"

---

## Step 1 — Identify the target

Extract the person's name or company from the user's message. If ambiguous,
check `data/career/this-week.md` for active interviews and ask which one.

## Step 2 — Run the prep script

```bash
npm run prep-interview -- "<name or company>"
```

This takes ~1–2 minutes (LinkedIn scraping + Google Search grounding).
Tell the user it's running. When it finishes, the briefing prints to stdout —
capture the key facts before proceeding.

## Step 3 — Read supporting context

```
.context/career-context.md      — positioning, story bank, what's being closed
data/career/this-week.md        — role details and any prior email context
```

## Step 4 — Run the prep session

Structure the session around three things:

**1. Their world**
What does the company do, what does this team own, what problems are they
likely hiring to solve? Surface anything from the script output that should
shape how Dallas positions himself.

**2. Story matching**
Map the role's likely needs to the behavioral story bank in
`.context/career-context.md`. Which stories fit? Which need sharpening?
Run the relevant stories out loud — time them, tighten them, make sure
outcomes are specific (numbers > effort language).

**3. Anticipated questions**
Based on the role type (EM vs. TPM vs. IC), surface the 3–5 questions
most likely to come up hard. Work through answers, not just topics.

## Step 5 — Close the loop

After prep, propose additions to `.context/career-context.md`:
- Any story that got sharpened during this session (update with the better version)
- New gaps identified ("this role will ask about X and I don't have a clean story")
- Post-interview: outcomes and impressions, if the interview already happened

On approval, edit and commit:
```bash
cd /Users/dallas/code/life/.context
git add career-context.md
git commit -m "update: interview prep for <company>"
git push
```
