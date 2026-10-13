#!/bin/bash
# Helper script for common Alembic operations
# Usage: ./migrate.sh [command]

set -e

case "$1" in
  upgrade)
    echo "Running migrations to head..."
    alembic upgrade head
    ;;
  downgrade)
    echo "Rolling back one revision..."
    alembic downgrade -1
    ;;
  revision)
    echo "Creating new revision: $2"
    alembic revision --autogenerate -m "$2"
    ;;
  history)
    alembic history --verbose
    ;;
  current)
    alembic current
    ;;
  *)
    echo "Usage: $0 {upgrade|downgrade|revision <message>|history|current}"
    exit 1
    ;;
esac
