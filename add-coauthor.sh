#!/bin/bash
# Sets danielscottmitchell as Author and adds as Co-authored-by on every commit.
# Override with: COAUTHOR_NAME="..." COAUTHOR_EMAIL="..." ./add-coauthor.sh

set -e
cd "$(dirname "$0")"

NAME="${COAUTHOR_NAME:-danielscottmitchell}"
EMAIL="${COAUTHOR_EMAIL:-daniel@lethalventures.com}"

CO_AUTHOR_LINE="Co-authored-by: $NAME <$EMAIL>"
export CO_AUTHOR_LINE
export GIT_AUTHOR_NAME="$NAME"
export GIT_AUTHOR_EMAIL="$EMAIL"
export GIT_COMMITTER_NAME="$NAME"
export GIT_COMMITTER_EMAIL="$EMAIL"

echo "Rewriting all commits: Author/Committer and Co-authored-by -> $NAME <$EMAIL>"
echo "This rewrites history. You will need to force-push when done."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || exit 0

FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
  --env-filter "
    export GIT_AUTHOR_NAME=\"$NAME\"
    export GIT_AUTHOR_EMAIL=\"$EMAIL\"
    export GIT_COMMITTER_NAME=\"$NAME\"
    export GIT_COMMITTER_EMAIL=\"$EMAIL\"
  " \
  --msg-filter '
    MSG=$(cat)
    if echo "$MSG" | grep -q "Co-authored-by: danielscottmitchell"; then
      echo "$MSG"
    else
      echo "$MSG"
      echo ""
      echo "$CO_AUTHOR_LINE"
    fi
  ' \
  -- HEAD

echo ""
echo "Done. To update the remote: git push --force-with-lease origin main"
echo "To remove the backup refs: git for-each-ref --format=\"delete %(refname)\" refs/original | git update-ref --stdin"
