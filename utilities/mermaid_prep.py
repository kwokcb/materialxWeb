import sys
import re

# Usage: python mermaid_prep.py input.md output.md

def convert_mermaid_blocks(text):
    # Replace only matching pairs of ```mermaid ... ```
    pattern = re.compile(r'```mermaid\s*([\s\S]*?)```', re.MULTILINE)
    def repl(match):
        content = match.group(1)
        return f'<pre><code class="language-mermaid"><div class="mermaid">\n{content}\n</div></code></pre>'
    return pattern.sub(repl, text)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: python mermaid_prep.py input.md output.md')
        sys.exit(1)
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    converted = convert_mermaid_blocks(content)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(converted)
    print(f'Converted Mermaid blocks in {input_file} and saved to {output_file}')
