#!/usr/bin/env bash
# Daily PostgreSQL backup -> compressed dump -> upload to S3.
# Schedule via cron:  0 3 * * *  /path/to/backup-postgres.sh
set -euo pipefail

: "${POSTGRES_HOST:?}" "${POSTGRES_USER:?}" "${POSTGRES_DB:?}" "${AWS_S3_BUCKET:?}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE="/tmp/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

echo "[backup] dumping ${POSTGRES_DB}..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
  | gzip > "${FILE}"

echo "[backup] uploading to s3://${AWS_S3_BUCKET}/backups/"
aws s3 cp "${FILE}" "s3://${AWS_S3_BUCKET}/backups/$(basename "${FILE}")"

echo "[backup] cleaning up local file"
rm -f "${FILE}"

echo "[backup] done."
