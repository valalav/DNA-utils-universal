import re

# Read the file
with open(r'c:\projects\DNA-utils-universal\str-matcher\src\components\str-matcher\MatchesTable.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all border classes
content = content.replace('border-border-light', 'border-black')
content = content.replace('border-border-medium', 'border-black')

# Write back
with open(r'c:\projects\DNA-utils-universal\str-matcher\src\components\str-matcher\MatchesTable.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacements done!")
