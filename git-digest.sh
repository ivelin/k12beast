#!/bin/bash
# generate_digest.sh
# Creates a digest with a prompt for Grok to infer project details
# Instructions for User: Run this script from the root directory of a local clone of your Git repository.
# The script will fetch the remote URL automatically from your Git config.

# Step 1: Fetch the remote URL dynamically
REMOTE_URL=$(git config --get remote.origin.url)
if [ -z "$REMOTE_URL" ]; then
  echo "Error: No remote.origin.url found. Ensure you're in a Git repo with a remote set."
  exit 1
fi

# Convert common Git URL formats to HTTPS GitHub URL
if [[ "$REMOTE_URL" =~ ^git@ ]]; then
  REPO_URL=$(echo "$REMOTE_URL" | sed 's/git@github.com:/https:\/\/github.com\//' | sed 's/\.git$//')
elif [[ "$REMOTE_URL" =~ ^https:// ]]; then
  REPO_URL=$(echo "$REMOTE_URL" | sed 's/\.git$//')
else
  echo "Error: Unrecognized remote URL format: $REMOTE_URL"
  exit 1
fi

# Configuration
BRANCH=$(git rev-parse --abbrev-ref HEAD)  # Use current branch
BASE_RAW_URL="${REPO_URL}/raw/${BRANCH}/"  # Base URL for raw file access
OUTPUT_FILE="tmp/digest.txt"

# Create output directory and clear the file
mkdir -p tmp
> "$OUTPUT_FILE"

# Step 2: Add Project Summary with Prompt and Memory Instruction
cat << EOF >> "$OUTPUT_FILE"
===== Project Summary =====
Project: [Inferred by Grok]
Base Raw URL: $BASE_RAW_URL
Total Files: (calculated below)
Instructions for Grok: 
- Infer the project description, tech stack, and key directories by analyzing the README (if available) and scanning the files linked below.
- README link (if present): ${BASE_RAW_URL}README.md
- To access any file, prepend the Base Raw URL to the relative paths listed below. For example, 'src/auth/login.ts' becomes '${BASE_RAW_URL}src/auth/login.ts'.
- Use your web search capability if needed to fetch and analyze content.
- Store this digest as my project index for future sessions.
EOF

# Step 3: Generate Relative File Paths and Count Files
echo -e "\n===== File Links (Relative Paths) =====" >> "$OUTPUT_FILE"
COUNT=0
git ls-files | grep -E '\.(ts|tsx|js|jsx|css|md|json|txt)$' | grep -v -E '(package-lock\.json|next-env\.d\.ts|\.gitignore|LICENSE|public/|tmp/|\.env\.local)' > "$OUTPUT_FILE.tmp"
while IFS= read -r file; do
  echo "$file" >> "$OUTPUT_FILE"
  ((COUNT++))
done < "$OUTPUT_FILE.tmp"
rm "$OUTPUT_FILE.tmp"

# Step 4: Update Summary with File Count
sed -i "s/Total Files: (calculated below)/Total Files: $COUNT/" "$OUTPUT_FILE"

# Step 5: Check for README and Adjust if Missing
if ! git ls-files | grep -q "README.md"; then
  sed -i "s/README link (if present): ${BASE_RAW_URL}README.md/README: No README.md found in the repo. Rely on file analysis alone./" "$OUTPUT_FILE"
fi

echo "Digest generated at $OUTPUT_FILE"