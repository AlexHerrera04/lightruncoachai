# Questions & Challenges API

## Overview

This API allows creating questions tied to content, assembling them into challenges for users, submitting answers with immediate feedback, and tracking competence progress automatically.

---

## Authentication

All endpoints require a JWT Bearer token.

```bash
POST /accounts/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

Save the `access` token:
```bash
export TOKEN="<access_token>"
```

---

## Endpoints

### Questions

#### List questions
```
GET /contents/questions/
```
Optional query param: `content_id` to filter by content.

```bash
curl -s "http://localhost:8000/contents/questions/?content_id=1" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

#### Get question detail
```
GET /contents/questions/<question_id>/
```
```bash
curl -s "http://localhost:8000/contents/questions/1/" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Note: `is_correct` is **never** included in question option responses — it is only revealed after the user submits an answer.

#### Create a question
```
POST /contents/questions/create/
```
```bash
curl -s -X POST http://localhost:8000/contents/questions/create/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": 1,
    "text": "What is the primary goal of financial management?",
    "question_type": "multiple_choice",
    "difficulty": "medium",
    "difficulty_level": 5,
    "options": [
      {"text": "Maximize shareholder value", "is_correct": true,  "sequence": 1},
      {"text": "Minimize employee costs",    "is_correct": false, "sequence": 2},
      {"text": "Increase product inventory", "is_correct": false, "sequence": 3},
      {"text": "Reduce operational risk",    "is_correct": false, "sequence": 4}
    ]
  }'
```

**question_type** choices: `multiple_choice`, `true_false`, `short_answer`  
**difficulty** choices: `easy`, `medium`, `hard`  
**difficulty_level**: integer 1–10

#### Generate questions via AI
```
POST /contents/questions/generate/
```

| Field | Required | Default | Description |
|---|---|---|---|
| `content_id` | Yes | — | Content to generate questions for |
| `count` | No | `5` | Number of questions to generate |
| `difficulty` | No | `medium` | `easy`, `medium`, or `hard` |
| `capacity_id` | No | — | Competence to target. If omitted, one is picked randomly from the content's assigned capacities. If the content has no capacities, the prompt falls back to `"General"` and the created questions have no capacity FK. |
| `language` | No | `es_la` | `es_la`, `en`, `pt_br`, or `fr` |

All generated questions are `multiple_choice` with **5 answer options** (exactly 1 correct).

```bash
curl -s -X POST http://localhost:8000/contents/questions/generate/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content_id": 1,
    "capacity_id": 3,
    "count": 5,
    "difficulty": "medium",
    "language": "es_la"
  }'
```

---

### Challenges

#### List challenges
```
GET /contents/challenges/
```
Optional query param: `status` to filter (`pending`, `active`, `completed`).

```bash
curl -s "http://localhost:8000/contents/challenges/?status=active" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

#### Get challenge detail
```
GET /contents/challenges/<challenge_id>/
```
Returns the challenge with its questions, progress summary, and running score.

```bash
curl -s "http://localhost:8000/contents/challenges/1/" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Example response:
```json
{
  "id": 1,
  "status": "active",
  "total_questions": 5,
  "answered_questions": 2,
  "score": {
    "correct": 1,
    "total_graded": 2,
    "percentage": 50.0
  },
  "challenge_questions": [...]
}
```

#### Create a challenge
```
POST /contents/challenges/create/
```

Questions are resolved automatically — pass a `content_id` or `capacity_id` (or both) and the API will attach matching questions to the challenge.

| Field | Required | Description |
|---|---|---|
| `user` | Yes | User ID |
| `content_id` | One of these | Pull questions from this content |
| `capacity_id` | One of these | Pull questions targeting this competence |
| `difficulty` | No | Array of difficulty levels: `["easy", "medium", "hard"]` |
| `count` | No | Max number of questions to include. Omit for all matching. |

- Questions are **shuffled** before selection.
- Questions in currently **pending/active** challenges are excluded (no duplicates mid-game). Questions from **completed** challenges are available again for retakes.
- Returns `400` if no questions are found matching the criteria.

By content, limiting to 5 medium or hard questions:
```bash
curl -s -X POST http://localhost:8000/contents/challenges/create/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user": 1,
    "content_id": 5,
    "difficulty": ["medium", "hard"],
    "count": 5
  }'
```

By competence, all difficulties:
```bash
curl -s -X POST http://localhost:8000/contents/challenges/create/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user": 1,
    "capacity_id": 3,
    "count": 10
  }'
```

#### Create a challenge automatically (from user profile)
```
POST /contents/challenges/create-auto/
```

Builds a challenge from the authenticated user's **assigned capacities** (set on their `AccountInfo` profile) — no `content_id` or `capacity_id` needed from the client.

| Field | Required | Description |
|---|---|---|
| `user` | Yes | User ID (from login response) |
| `difficulty` | No | Array of difficulty levels: `["easy", "medium", "hard"]` |
| `count` | No | Max number of questions. Omit for all matching. |

**Behaviour:**
1. Reads the user's capacities from `AccountInfo.capacity`
2. Reads the user's current capacity scores from `ADNUserRecord` (0–100, SCD Type 2) — capacities with lower scores are prioritised first
3. Reads the user's view/interaction history from the `Interaction` table — content the user has already seen is promoted to the front of the queue
4. Finds questions across all active content that match those capacities, excluding any already answered in a pending/active challenge
5. Orders questions deterministically: **Tier 1** = questions from viewed content (weakest capacity first), **Tier 2** = questions from unseen content (weakest capacity first)
6. If no questions exist yet, auto-generates them via AI from a random matching content (Bedrock)
7. Limits to `count` and returns the challenge — no random shuffling

**Error cases:**

| Condition | Status | Message |
|---|---|---|
| User has no `AccountInfo` record | 400 | "User profile not found. Cannot determine capacities." |
| `AccountInfo` has no capacities assigned | 400 | "No capacities assigned to this user's profile." |
| No content matches the user's capacities | 400 | "No content available for your current capacities." |

```bash
curl -s -X POST http://localhost:8000/contents/challenges/create-auto/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user": 1,
    "difficulty": ["medium", "hard"],
    "count": 5
  }'
```

Response shape is identical to `POST /contents/challenges/create/`.

#### Update challenge status
```
PATCH /contents/challenges/<challenge_id>/update/
```
Manually update status or timestamps if needed.

```bash
curl -s -X PATCH "http://localhost:8000/contents/challenges/1/update/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

**status** choices: `pending`, `active`, `completed`

#### Get all answer results for a challenge
```
GET /contents/challenges/<challenge_id>/answers/results/
```
Returns grading for all answers in one call. Returns `202` with a `warning` field if the challenge is not yet completed (partial results).

```bash
curl -s "http://localhost:8000/contents/challenges/1/answers/results/" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

### Answers

#### Submit an answer
```
POST /contents/answers/submit/
```
- `multiple_choice` and `true_false` are **auto-graded** — response includes `is_correct`, `correct_option_id`, and the running `challenge_score`.
- `short_answer` responses return `is_correct: null` until manually graded by an admin.
- When the last question is answered, the challenge automatically transitions to `completed` and competence progress is updated.

```bash
curl -s -X POST http://localhost:8000/contents/answers/submit/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "challenge": 1,
    "question": 1,
    "selected_option": 3
  }'
```

Example response:
```json
{
  "id": 7,
  "challenge": 1,
  "question": 1,
  "question_text": "What is the primary goal of financial management?",
  "selected_option": 3,
  "selected_option_text": "Increase product inventory",
  "is_correct": false,
  "marked_at": "2026-04-05T14:23:01Z",
  "submitted_at": "2026-04-05T14:23:01Z",
  "correct_option_id": 1,
  "challenge_score": {
    "correct": 1,
    "total_answered": 2,
    "total_graded": 2,
    "percentage": 50.0
  }
}
```

For `short_answer` questions use `answer_text` instead:
```bash
curl -s -X POST http://localhost:8000/contents/answers/submit/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "challenge": 1,
    "question": 2,
    "answer_text": "To allocate resources efficiently and maximise returns."
  }'
```

#### Get answer result (single)
```
GET /contents/answers/<answer_id>/result/
```
Returns grading for a single answer. Returns `202` if not yet graded.

```bash
curl -s "http://localhost:8000/contents/answers/7/result/" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

#### Grade a short answer (admin only)
```
PATCH /contents/answers/<answer_id>/grade/
```
Only applies to `short_answer` questions. Requires staff/admin token.

```bash
curl -s -X PATCH "http://localhost:8000/contents/answers/7/grade/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_correct": true}'
```

#### List answers
```
GET /contents/answers/
```
Optional query param: `challenge_id` to filter by challenge.

```bash
curl -s "http://localhost:8000/contents/answers/?challenge_id=1" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## Full end-to-end flow

```
1. POST /accounts/login/                             → get JWT token
2. GET  /contents/                                   → pick a content_id
3. POST /contents/questions/generate/                → generate questions via AI
   — or —
   POST /contents/questions/create/                  → manually create questions
4. GET  /contents/questions/?content_id=X            → confirm questions exist
5. POST /contents/challenges/create/                 → create challenge (content_id + difficulty + count)
6. GET  /contents/challenges/<id>/                   → see questions + total_questions + score
7. POST /contents/answers/submit/  (× N questions)  → submit each answer, get immediate feedback
                                                        (is_correct + correct_option_id + challenge_score)
8. GET  /contents/challenges/<id>/answers/results/  → fetch all results at once after completion
```

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| `201` | Answer submitted / Challenge created |
| `202` | Answer not yet graded (short_answer pending) / Challenge not yet completed |
| `400` | Validation error (e.g. no questions found, question not in challenge) |
| `403` | Permission denied (e.g. grading without admin token) |
| `404` | Resource not found |

---

## Django Admin

### Content actions

These bulk operations are available from the **Content list** page at `/admin/contents/content/`:

1. Select one or more content rows using the checkboxes
2. Choose an action from the **Action** dropdown at the top of the list
3. Click **Go**

---

#### Generate AI questions for selected contents

**Action:** `Generate AI questions for selected contents`

Opens a configuration form before running generation. Available parameters:

| Field | Default | Description |
|---|---|---|
| Count | 5 | Number of questions to generate per content (1–20) |
| Num options | 5 | Number of answer options per question (2–10) |
| Difficulty | Medium | `easy`, `medium`, or `hard` |
| Language | Español Latino | `es_la`, `en`, `pt_br`, or `fr` |
| Capacity | — | Optional override. Dropdown shows only capacities assigned to the selected contents. If blank, one is picked randomly from each content's assigned capacities. |
| Additional context | — | Optional free-text to steer the AI (e.g. "focus on practical scenarios") |

All generated questions are `multiple_choice`.

Generation calls AWS Bedrock (Claude) and typically takes 10–30 seconds per content. Keep the tab open until the success message appears.

---

#### Delete all questions for selected contents

**Action:** `Delete all questions for selected contents`

Shows a **confirmation page** before deleting anything. The confirmation page lists each selected content and how many questions it has, plus the total. Deletion is permanent and also removes any `ChallengeQuestion` links referencing those questions.

Click **Cancel** to go back without making any changes.

---

### Question management

Individual questions are managed at `/admin/contents/question/`.

**List view** — filterable by type, difficulty, language, capacity, and organization level. Searchable by question text or content name.

**Change page** (`/admin/contents/question/<id>/`) — edit the question text, type, difficulty, language, and capacity. Answer options are shown as an inline table below the question:

- **Edit an option** — change the text or toggle `is_correct` directly in the table and click **Save**.
- **Delete specific options** — check the **Delete** checkbox on the right of each option row you want to remove, then click **Save**.
- **Delete all options** — check every delete checkbox in the inline and click **Save**.
- **Add a new option** — fill in the blank row at the bottom of the inline table and click **Save**.

**List view action:** select one or more questions and choose **"Delete all options for selected questions"** from the Action dropdown to wipe all their options in one step.

---

## Notes

- All timestamps are stored and returned in **UTC**.
- `is_correct` is never exposed on question options — only revealed via the submit response or result endpoints.
- A user can only see their own challenges.
- Creating a challenge requires at least one Content record in the database. Use the admin panel at `/admin/` to seed data if the DB is empty.
