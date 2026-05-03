# AI-generated title

**What:** there is no title input on the upload dropzone. The row's
`title` starts as the filename (minus extension) as a placeholder. The
analyze step returns a `title` field on `feedbackSchema` that we
conditionally adopt with:

```sql
update conversations set title = <ai_title>
where id = <id> and title = <filename_default>
```

If the user renamed in the meantime, the predicate fails and the AI
title is discarded — user input always wins.

**Why:** asking the user to title a call before they've seen the
transcript is friction *and* yields worse titles than the model
produces. CRM-style "Discovery call with Acme — pricing pushback" is
consistently more useful than what people type into a hurried form.

**Cost:** the placeholder filename is shown for ~30 s while analysis
runs. Edge case: if a user renames to *exactly* the filename default
during that window, AI title still wins. Accepted.

**See also:** [[ai-pipeline]], [[upload]].
