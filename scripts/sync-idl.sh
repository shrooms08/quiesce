#!/usr/bin/env bash
set -euo pipefail
cp target/idl/quiesce.json app/src/lib/idl/quiesce.json
{
  echo '// Auto-copied from target/ — re-run scripts/sync-idl.sh after Anchor program changes'
  cat target/types/quiesce.ts
} > app/src/lib/idl/quiesce.ts
echo "Synced IDL and types to app/src/lib/idl/"
