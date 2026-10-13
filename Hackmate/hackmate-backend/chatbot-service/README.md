# Chatbot Service

Provides an AI-powered chatbot for HackMate participants. Handles natural language queries, matches intents, and logs conversations to the database.

## Structure

```
chatbot-service/
├── main.py               # FastAPI app setup
├── config.py             # Environment config (OpenAI key, etc.)
├── requirements.txt
├── Dockerfile
├── db/
│   └── database.py       # SQLAlchemy engine & session
├── models/
│   └── chat_log.py       # ChatbotLog ORM model
├── routers/
│   └── chatbot.py        # Chat endpoint
├── schemas/
│   └── chatbot.py        # Pydantic request/response models
├── services/
│   ├── chatbot_engine.py  # OpenAI integration & response generation
│   └── intent_matcher.py  # Rule-based intent classification
└── tests/
    ├── conftest.py
    ├── test_chatbot.py
    └── __init__.py
```

## Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/chatbot/chat` | Send a message, get a response | Required |
| `GET` | `/chatbot/history` | Get own chat history | Required |

## How It Works

1. Incoming message is passed through `intent_matcher` for rule-based classification
2. If no intent matches, the message is forwarded to the OpenAI API via `chatbot_engine`
3. The question and response are persisted to `chatbot_logs`

## Data Models

- **ChatbotLog** — user_id, question, response, created_at

## Tech Stack

- **FastAPI** 0.111.0
- **OpenAI** 1.30.1 — LLM-powered responses
- **SQLAlchemy** + **psycopg2** — PostgreSQL ORM

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for verifying tokens |
| `OPENAI_API_KEY` | OpenAI API key |

## Running

```bash
uvicorn main:app --host 0.0.0.0 --port 8007
```
