# Environment Variables

The application reads its configuration from a `.env` file in the `backend/` directory (loaded via `python-dotenv` at startup).

Copy the example block at the bottom of this page to `backend/.env` and fill in the values for your environment.

---

## Variables

### Core

| Variable | Required | Description |
|---|---|---|
| `ENVIRONMENT` | Yes | Controls which database is used and enables dev tooling. One of `production`, `development`, or `testing`. |
| `SECRET_KEY` | Yes | Django secret key used for cryptographic signing (sessions, CSRF tokens, password reset links). Must be long, random, and kept private. Generate one with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`. |

---

### Database

The active database is selected by `ENVIRONMENT`. Each environment has its own set of connection variables.

**`ENVIRONMENT=production` → uses `DB_*`**

| Variable | Description |
|---|---|
| `DB_NAME` | Production database name |
| `DB_USER` | Production database user |
| `DB_PASSWORD` | Production database password |
| `DB_HOST` | Production database host (e.g. RDS endpoint) |
| `DB_PORT` | Production database port (usually `5432`) |

**`ENVIRONMENT=development` → uses `DEV_DB_*`**

| Variable | Description |
|---|---|
| `DEV_DB_NAME` | Development database name |
| `DEV_DB_USER` | Development database user |
| `DEV_DB_PASSWORD` | Development database password |
| `DEV_DB_HOST` | Development database host |
| `DEV_DB_PORT` | Development database port |

**`ENVIRONMENT=testing` → uses `TEST_LOCAL_DB_*`**

| Variable | Description |
|---|---|
| `TEST_LOCAL_DB_NAME` | Test database name |
| `TEST_LOCAL_DB_USER` | Test database user |
| `TEST_LOCAL_DB_PASSWORD` | Test database password |
| `TEST_LOCAL_DB_HOST` | Test database host (usually `127.0.0.1`) |
| `TEST_LOCAL_DB_PORT` | Test database port. The Docker Compose Postgres container runs on **5435** by default. |

> The local Docker Postgres is defined in `docker-compose-postgres.yml` and runs on port **5435** to avoid conflicts with any system-level Postgres.

---

### AWS — S3 (Content storage)

Used by `django-storages` to serve and store uploaded content files.

| Variable | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM access key with S3 read/write permissions |
| `AWS_SECRET_ACCESS_KEY` | Secret for the above key |
| `AWS_BUCKET_NAME` | S3 bucket name for content files |
| `AWS_STORAGE_BUCKET_NAME` | Same bucket — used by `django-storages` (`DEFAULT_FILE_STORAGE`) |
| `AWS_S3_ENDPOINT_URL` | Full S3 endpoint URL (e.g. `https://<bucket>.s3.<region>.amazonaws.com`) |

---

### AWS — S3 (Asset storage)

Used by the upload utilities in `backend/utils/` for static assets (separate bucket from content files).

| Variable | Description |
|---|---|
| `AWS_ASSETS_BUCKET_NAME` | S3 bucket name for static/media assets |
| `AWS_ASSETS_S3_ENDPOINT_URL` | Full S3 endpoint URL for the assets bucket |

---

### AWS — Bedrock (AI question generation)

Used by `backend/contents/utils/question_generation.py` to call Claude via AWS Bedrock. Required for `POST /contents/questions/generate/`, `POST /contents/questions/generate-batch/`, and `POST /contents/challenges/create-auto/` (fallback generation).

The same `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` pair is used — the IAM user must also have `bedrock:InvokeModel` permission on the configured model ARN.

| Variable | Default | Description |
|---|---|---|
| `AWS_BEDROCK_REGION` | `us-east-1` | AWS region where the Bedrock inference profile is deployed |
| `AWS_BEDROCK_MODEL` | — | Full ARN of the Bedrock inference profile (e.g. `arn:aws:bedrock:us-east-1:<account>:inference-profile/global.anthropic.claude-sonnet-4-5-...`) |

---

### Email

Used by Django's SMTP email backend for password reset and notification emails.

| Variable | Description |
|---|---|
| `EMAIL_HOST` | SMTP server hostname |
| `EMAIL_PORT` | SMTP port (SSL — typically `465`) |
| `EMAIL_HOST_USER` | SMTP login username |
| `EMAIL_HOST_PASSWORD` | SMTP login password |
| `DEFAULT_FROM_EMAIL` | Sender address shown on outgoing emails |
| `FRONTEND_URL` | Base URL of the frontend app — used to build password reset links in emails |

---

### Third-party APIs

| Variable | Used by | Description |
|---|---|---|
| `OPENAI_API_KEY` | `diagnoses/insights_utils.py` | OpenAI API key for diagnostic insight generation |
| `EXA_API_KEY` | Not yet wired into settings | Reserved for Exa search API integration |

---

## Example `.env`

Copy this to `backend/.env` and replace all placeholder values:

```dotenv
# ---------------------------------------------------------------
# Core
# ---------------------------------------------------------------
ENVIRONMENT="testing"
SECRET_KEY="replace-with-a-long-random-string"

# ---------------------------------------------------------------
# Database — production (ENVIRONMENT=production)
# ---------------------------------------------------------------
DB_NAME=mydb_prod
DB_USER=dbuser
DB_PASSWORD=changeme
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432

# ---------------------------------------------------------------
# Database — development (ENVIRONMENT=development)
# ---------------------------------------------------------------
DEV_DB_NAME=mydb_dev
DEV_DB_USER=dbuser
DEV_DB_PASSWORD=changeme
DEV_DB_HOST=your-rds-endpoint.amazonaws.com
DEV_DB_PORT=5432

# ---------------------------------------------------------------
# Database — local/testing (ENVIRONMENT=testing)
# Docker Compose Postgres runs on 5435 by default.
# ---------------------------------------------------------------
TEST_LOCAL_DB_NAME=mydb
TEST_LOCAL_DB_USER=dbuser
TEST_LOCAL_DB_PASSWORD=changeme
TEST_LOCAL_DB_HOST=127.0.0.1
TEST_LOCAL_DB_PORT=5435

# ---------------------------------------------------------------
# AWS — IAM credentials (used for S3 and Bedrock)
# ---------------------------------------------------------------
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ---------------------------------------------------------------
# AWS — S3 content bucket
# ---------------------------------------------------------------
AWS_BUCKET_NAME=your-content-bucket
AWS_STORAGE_BUCKET_NAME=your-content-bucket
AWS_S3_ENDPOINT_URL=https://your-content-bucket.s3.sa-east-1.amazonaws.com

# ---------------------------------------------------------------
# AWS — S3 assets bucket
# ---------------------------------------------------------------
AWS_ASSETS_BUCKET_NAME=your-assets-bucket
AWS_ASSETS_S3_ENDPOINT_URL=https://your-assets-bucket.s3.sa-east-1.amazonaws.com

# ---------------------------------------------------------------
# AWS — Bedrock (AI question generation)
# Requires bedrock:InvokeModel on the model ARN below.
# ---------------------------------------------------------------
AWS_BEDROCK_REGION="us-east-1"
AWS_BEDROCK_MODEL="arn:aws:bedrock:us-east-1:<account-id>:inference-profile/global.anthropic.claude-sonnet-4-5-20250929-v1:0"

# ---------------------------------------------------------------
# Email (SMTP / SSL)
# ---------------------------------------------------------------
EMAIL_HOST=smtp.example.com
EMAIL_PORT=465
EMAIL_HOST_USER=noreply@example.com
EMAIL_HOST_PASSWORD=changeme
DEFAULT_FROM_EMAIL=noreply@example.com
FRONTEND_URL=https://yourapp.example.com

# ---------------------------------------------------------------
# Third-party APIs
# ---------------------------------------------------------------
OPENAI_API_KEY=sk-...
EXA_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
