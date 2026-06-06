#!/bin/bash

# Sync all votes for all 1,630 DReps in batches of 50
# Reads CRON_SECRET from .env.local
# Makes ~33 API calls with 3-second delays between them

set -e

# Read CRON_SECRET from .env.local
if [ ! -f .env.local ]; then
  echo "Error: .env.local not found"
  exit 1
fi

CRON_SECRET=$(grep CRON_SECRET .env.local | cut -d '=' -f2)
if [ -z "$CRON_SECRET" ]; then
  echo "Error: CRON_SECRET not found in .env.local"
  exit 1
fi

ENDPOINT="https://www.adapolis.net/api/sync/votes"
BATCH_SIZE=50
MAX_DREPS=1630
DELAY_SECONDS=3

echo "=========================================="
echo "Syncing votes for all $MAX_DREPS DReps"
echo "Batch size: $BATCH_SIZE"
echo "Estimated batches: $((($MAX_DREPS + $BATCH_SIZE - 1) / $BATCH_SIZE))"
echo "=========================================="
echo ""

total_synced=0
total_errors=0
batch_count=0

# Loop through offsets: 0, 50, 100, 150, ..., 1600
offset=0
while [ $offset -lt $MAX_DREPS ]; do
  batch_count=$((batch_count + 1))

  echo "Batch $batch_count: offset=$offset, limit=$BATCH_SIZE"

  # Make the API call and capture the response
  response=$(curl -s -X POST "$ENDPOINT" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"limit\": $BATCH_SIZE, \"offset\": $offset}")

  # Extract synced and errors counts from JSON response
  synced=$(echo "$response" | grep -o '"synced":[0-9]*' | cut -d ':' -f2)
  errors=$(echo "$response" | grep -o '"errors":[0-9]*' | cut -d ':' -f2)

  # Handle missing values
  synced=${synced:-0}
  errors=${errors:-0}

  total_synced=$((total_synced + synced))
  total_errors=$((total_errors + errors))

  echo "  ✓ Synced: $synced, Errors: $errors, Total so far: $total_synced"

  # Move to next offset
  offset=$((offset + BATCH_SIZE))

  # Wait before next call (except after the last one)
  if [ $offset -lt $MAX_DREPS ]; then
    sleep $DELAY_SECONDS
  fi
done

echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo "Total batches processed: $batch_count"
echo "Total votes synced:      $total_synced"
echo "Total errors:            $total_errors"
echo "=========================================="
