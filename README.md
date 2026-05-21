# Harpoon

**AI-powered consumer financial document analyzer. No data collection. No ads. No upsells.**

Harpoon helps everyday people understand financial documents they receive — debt collection letters, medical bills, credit agreements — and know their rights. It's built for users who are often at their most vulnerable: dealing with a medical bill they can't afford, a debt collector they don't understand, or a loan agreement full of fine print.

---

## What It Does

Upload a photo or scan of a financial document. Harpoon analyzes it and returns:

- **Document Type** — what kind of document it is
- **Red Flags** — specific problematic items, rated by severity (Minor / Medium / Major / Illegal), with dollar and percentage impact where calculable
- **Your Rights** — what you're legally entitled to, citing applicable law (FDCPA, FCRA, ACA, state statutes)
- **Action Steps** — a numbered, prioritized list of concrete next steps in plain language
- **Urgency Rating** — Low / Medium / High with explanation

Document categories supported:
- `DEBT_COLLECTION`
- `MEDICAL_BILL`
- `CREDIT_AGREEMENT`
- `UNKNOWN`

---

## Why It Exists

Most resources available to consumers in financial distress are either paywalled, buried in legal jargon, or run by businesses with conflicting incentives (lead generation, data harvesting, upsells). Harpoon has none of those. The trust model is the product.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (TypeScript) |
| Backend | FastAPI (Python) |
| AI | Google Gemma 4 (multimodal) for pics, Google Gemini 3 for pdfs|
| Hosting — Frontend | AWS Amplify |
| Hosting — Backend | AWS ECS Fargate |
| Load Balancer | AWS ALB |
| Container Registry | AWS ECR |
| DNS | name.com → `harpoon.online` / `api.harpoon.online` |

---

## Project Structure

```
harpoon/
├── frontend/          # Next.js app
│   ├── app/
│   │   ├── globals.css
│   │   └── layout.tsx
│   └── ...
├── backend/           # FastAPI app
│   ├── main.py
│   ├── prompts/
│   │   └── analysis_prompt.py
│   ├── requirements.txt
│   └── Dockerfile
```

---

## Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- API key for your LLM provider (set in `.env`)

### Backend

```bash
cd harpoon/backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`.

### Frontend

```bash
cd harpoon/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

Make sure `NEXT_PUBLIC_API_URL` in your frontend environment points to `http://localhost:8000` for local development.

---

## Deployment (AWS)

The production stack uses:

- **AWS Amplify** for the Next.js frontend (auto-deploys from GitHub)
- **AWS ECS Fargate** for the containerized FastAPI backend
- **AWS ALB** routing `api.harpoon.online` to the backend target group
- **AWS ECR** storing the backend Docker image
- **ACM** for SSL certificates on both domains

For a full walkthrough of the AWS deployment process, see [`docs/aws_deployment.md`](docs/aws_deployment.md).

---

## Prompt Design

The system prompt instructs the model to approach every document from the consumer's perspective, with no affiliation to financial institutions. The analysis structure is designed to surface actionable information in plain language — not legal disclaimers, not generic advice.

Red flag severity categories:

| Level | Description |
|---|---|
| Minor | Hidden fees or fine print; may surprise the user |
| Medium | Terms that could cause financial stress; not necessarily predatory but worth knowing |
| Major | Predatory terms; should not be accepted without careful consideration; may be illegal |
| Illegal | Practices that violate consumer protection law |

---

## Disclaimer

Harpoon provides general information to help users understand their documents and rights. It is not legal advice. For complex situations, consult a licensed attorney or your state's consumer protection office.

---

## Submission Context

This project was submitted to the **Gemma 4 Good Kaggle Competition** (May 2026) under the Digital Equity / Consumer Safety category.

---

## License

MIT
