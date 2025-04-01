# Dump all repo source code into one file 
# that Super Grok 3 can accept as an attachment

# Create the output file and clear it if it exists
> all_files.txt

# Loop through all tracked text files and append their names and contents
git ls-files | grep -E '\.(ts|tsx|js|jsx|css|md|json|txt)$' | while read -r file; do

  echo "===== File: $file =====" >> tmp/all_files.txt
  cat "$file" >> tmp/all_files.txt
  echo -e "\n\n" >> tmp/all_files.txt
done
