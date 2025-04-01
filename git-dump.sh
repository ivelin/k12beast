# Dump all repo source code into one file 
# that Super Grok 3 can accept as an attachment
#
# Note: Grok 3 has 128K context size limitation.
# It is important to skip all non-essential files 
# from the final code dump file so that its total
# size is well below 100K. 
# The smaller than 100K the longer a Grok 3 session can last 
# without losing track of early session context.
# When that happens, a new Grok 3 session has to be started.

# Create the output file and clear it if it exists
mkdir -p tmp
> tmp/all_files.txt

# Loop through all tracked text files, excluding bulky/non-essential files
git ls-files | grep -E '\.(ts|tsx|js|jsx|css|md|json|txt)$' | grep -v -E '(package-lock\.json|next-env\.d\.ts|\.gitignore|LICENSE|public/|tmp/|\.env\.local)' | while read -r file; do
  echo "===== File: $file =====" >> tmp/all_files.txt
  cat "$file" >> tmp/all_files.txt
  echo -e "\n\n" >> tmp/all_files.txt
done