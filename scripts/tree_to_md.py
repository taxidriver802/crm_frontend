#!/usr/bin/env python3
"""
Convert `tree -d` output into a nested, bolded markdown list.

Usage:
    python3 tree_to_md.py projecttree.md > structure.md
    tree -d | python3 tree_to_md.py > structure.md
"""
import re
import sys

# Matches lines like "│   ├── src" or "    └── app"
LINE_RE = re.compile(r'^((?:(?:│   )|(?:    ))*)(├── |└── )(.*)$')


def parse_tree(lines):
    entries = []  # list of (depth, name)
    for raw in lines:
        line = raw.rstrip('\n').replace('\xa0', ' ')  # normalize non-breaking spaces
        stripped = line.strip()
        if not stripped or stripped == '.' or stripped.startswith('```'):
            continue
        if stripped[0].isdigit() and 'director' in stripped:
            continue  # skip the "N directories" summary line
        m = LINE_RE.match(line)
        if not m:
            continue
        indent, _marker, name = m.groups()
        depth = len(indent) // 4
        entries.append((depth, name.strip()))
    return entries


def to_markdown(entries):
    lines = []
    for i, (depth, name) in enumerate(entries):
        has_children = i + 1 < len(entries) and entries[i + 1][0] > depth
        indent = '  ' * depth
        if has_children:
            lines.append(f"{indent}- **{name}/**")
        else:
            lines.append(f"{indent}- {name}")
    return '\n'.join(lines)


def main():
    if len(sys.argv) > 1:
        text = open(sys.argv[1]).read()
    else:
        text = sys.stdin.read()
    entries = parse_tree(text.splitlines())
    print(to_markdown(entries))


if __name__ == '__main__':
    main()
