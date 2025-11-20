import argparse
import pathlib
import random
import re
import sys
from datetime import datetime
from html import escape
from shutil import copy2

ROOT = pathlib.Path(__file__).resolve().parent

def hsl_to_hex(h, s, l):
    s /= 100
    l /= 100
    if s == 0:
        r = g = b = round(l * 255)
    else:
        q = l * (1 + s) if l < 0.5 else l + s - l * s
        p = 2 * l - q

        def hue_to_rgb(p, q, t):
            if t < 0:
                t += 1
            if t > 1:
                t -= 1
            if t < 1/6:
                return p + (q - p) * 6 * t
            if t < 1/2:
                return q
            if t < 2/3:
                return p + (q - p) * (2/3 - t) * 6
            return p

        r = hue_to_rgb(p, q, h / 360 + 1/3)
        g = hue_to_rgb(p, q, h / 360)
        b = hue_to_rgb(p, q, h / 360 - 1/3)
        r = round(r * 255)
        g = round(g * 255)
        b = round(b * 255)

    return f"#{r:02X}{g:02X}{b:02X}"

def random_soft_color():
    h = random.randint(0, 359)
    s = random.randint(14, 30)
    l = random.randint(80, 92)
    return hsl_to_hex(h, s, l)

def apply_markdown_inlines(text):
    if not text.strip():
        return ""
    text = escape(text)
    text = re.sub(r'```(.+?)```', r'<code>\1</code>', text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    text = re.sub(r'\*\*([^\*]+)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*([^\*]+)\*', r'<em>\1</em>', text)
    text = re.sub(r'__(.+?)__', r'<strong>\1</strong>', text)
    text = re.sub(r'_([^_]+)_', r'<em>\1</em>', text)
    text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1" />', text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    return text

def convert_markdown_to_html(markdown):
    lines = markdown.strip().splitlines()
    html = []
    in_code = False
    code_lang = ""
    code_lines = []
    list_stack = []
    table_buffer = []
    table_has_delim = False

    def flush_list():
        if list_stack:
            html.append(f"</{list_stack.pop()}>")

    def flush_table():
        nonlocal table_buffer, table_has_delim
        if not table_buffer:
            return
        html.append("<table>")
        if table_has_delim and len(table_buffer) > 1:
            header = table_buffer[0]
            html.append("  <thead><tr>" + "".join(f"<th>{escape(cell)}</th>" for cell in header) + "</tr></thead>")
            body_start = 1
        else:
            body_start = 0
        if len(table_buffer) > body_start:
            html.append("  <tbody>")
            for row in table_buffer[body_start:]:
                html.append("    <tr>" + "".join(f"<td>{escape(cell)}</td>" for cell in row) + "</tr>")
            html.append("  </tbody>")
        html.append("</table>")
        table_buffer = []
        table_has_delim = False

    for raw in lines:
        line = raw.rstrip()
        if re.match(r'^\s*```(\w*)', line):
            if in_code:
                content = "\n".join(code_lines)
                lang_attr = f' class="{code_lang}"' if code_lang else ""
                html.append(f'<pre><code{lang_attr}>{escape(content)}</code></pre>')
                code_lines = []
                in_code = False
                code_lang = ""
            else:
                in_code = True
                code_lang = re.match(r'^\s*```(\w*)', line).group(1) or ""
            continue
        if in_code:
            code_lines.append(raw)
            continue
        if not line.strip():
            flush_list()
            flush_table()
            continue
        if re.match(r'^\s*\|', raw):
            trimmed = raw.strip()
            trimmed = re.sub(r'^\|', '', trimmed)
            trimmed = re.sub(r'\|\s*$', '', trimmed)
            cells = [cell.strip() for cell in trimmed.split('|')]
            is_delim = all(re.fullmatch(r'[\:\-]+', c) for c in cells if c)
            if is_delim:
                if table_buffer:
                    table_has_delim = True
                continue
            table_buffer.append(cells)
            continue
        flush_table()
        heading = re.match(r'^(#{1,6})\s*(.+)$', line)
        if heading:
            flush_list()
            level = len(heading.group(1))
            html.append(f"<h{level}>{escape(heading.group(2))}</h{level}>")
            continue
        blockquote = re.match(r'^\s*>\s*(.+)$', line)
        if blockquote:
            flush_list()
            html.append(f"<blockquote>{apply_markdown_inlines(blockquote.group(1))}</blockquote>")
            continue
        list_match = re.match(r'^\s*([-*+])\s+(.+)$', line)
        if list_match:
            if not list_stack:
                list_stack.append("ul")
                html.append("<ul>")
            html.append(f"  <li>{apply_markdown_inlines(list_match.group(2))}</li>")
            continue
        flush_list()
        html.append(f"<p>{apply_markdown_inlines(line)}</p>")

    if in_code:
        content = "\n".join(code_lines)
        lang_attr = f' class="{code_lang}"' if code_lang else ""
        html.append(f'<pre><code{lang_attr}>{escape(content)}</code></pre>')
    flush_list()
    flush_table()
    return "\n".join(html)

def update_root_index(page_path, title):
    root_index = ROOT / "index.html"
    if not root_index.exists():
        return
    content = root_index.read_text(encoding="utf-8")
    relative = page_path.as_posix()
    if not relative.startswith("pages/"):
        relative = f"pages/{relative}"
    if f'href="{relative}/"' in content:
        return
    pattern = re.compile(r'(?s)(<template[^>]*id=["\']article-links-template["\'][^>]*>.*?<ul[^>]*>)(.*?)(</ul>)(.*?</template>)')
    match = pattern.search(content)
    if not match:
        return
    before, inner, after_ul, trailing = match.groups()
    new_inner = inner.rstrip() + f"\n      <li><a href=\"{relative}/\">{title}</a></li>\n"
    replaced = before + new_inner + after_ul + trailing
    updated = content[:match.start()] + replaced + content[match.end():]
    root_index.write_text(updated, encoding="utf-8")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pagepath", help="pages/<name>")
    args = parser.parse_args()

    page_path = pathlib.Path(args.pagepath).resolve()
    md_path = page_path / "index.md"
    if not md_path.exists():
        print("Markdown ファイルが見つかりません", file=sys.stderr)
        sys.exit(1)

    template_dir = ROOT / "pages" / "template"
    template_html = template_dir / "index.html"
    template_css = template_dir / "stylesheet.css"
    template_js = template_dir / "script.js"

    if not template_html.exists() or not template_css.exists():
        print("テンプレートが足りません", file=sys.stderr)
        sys.exit(1)

    content = md_path.read_text(encoding="utf-8")
    lines = content.splitlines()
    front = False
    front_end = -1
    title = ""
    for idx, line in enumerate(lines):
        if line.strip() == "---":
            if not front:
                front = True
            else:
                front_end = idx
                break
        elif front:
            title_match = re.match(r'title:\s*"(.*)"', line)
            if title_match:
                title = title_match.group(1)
            else:
                title_match = re.match(r"title:\s*'(.*)'", line)
                if title_match:
                    title = title_match.group(1)
                else:
                    title_match = re.match(r'title:\s*(.+)', line)
                    if title_match:
                        title = title_match.group(1).strip()
    if not title:
        title = page_path.name

    body_lines = lines[front_end+1:] if front_end >= 0 else lines
    body_markdown = "\n".join(body_lines).strip()
    created = datetime.fromtimestamp(md_path.stat().st_ctime).strftime("%Y-%m-%d %H:%M")
    updated = datetime.now().strftime("%Y-%m-%d %H:%M")
    body_markdown = f"作成: {created}\n\n{body_markdown}\n\n最終更新: {updated}"

    body_html = convert_markdown_to_html(body_markdown)

    html_template = template_html.read_text(encoding="utf-8")
    html_content = html_template
    html_content = html_content.replace("$title$", escape(title))
    html_content = html_content.replace("$body$", body_html)
    html_content = html_content.replace("$toc$", "")

    home_path = "../../index.html" if page_path.parts[0] == "pages" else "../index.html"
    html_content = re.sub(r'href\s*=\s*"(?:\.\.\/)*index\.html"', f'href="{home_path}"', html_content, flags=re.IGNORECASE)
    html_content = re.sub(r'href\s*=\s*"\s*index\.html\s*"', f'href="{home_path}"', html_content, flags=re.IGNORECASE)

    local_script = page_path / "script.js"
    if template_js.exists():
        copy2(template_js, local_script)
    script_ref = "script.js" if local_script.exists() else home_path.replace("index.html", "script.js")
    if "script.js" not in html_content:
        html_content = re.sub(r'(</body>)', f'<script src="{script_ref}"></script>\n\\1', html_content, flags=re.IGNORECASE | re.DOTALL)

    page_path.mkdir(parents=True, exist_ok=True)
    (page_path / "index.html").write_text(html_content, encoding="utf-8")

    css_text = template_css.read_text(encoding="utf-8")
    css_text = css_text.replace("#EEFFEE", random_soft_color())
    extra = """
table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6em 0;
}
table th, table td {
  border: 1px solid rgba(0,0,0,0.08);
  padding: 0.5em 0.6em;
  text-align: left;
  background: rgba(255,255,255,0.02);
}
table th { font-weight: bold; }
pre, code {
  font-family: Consolas, 'Courier New', monospace;
  background: rgba(0,0,0,0.03);
  color: inherit;
}
pre {
  padding: 0.8em;
  overflow: auto;
  border-radius: 6px;
  margin: 0.8em 0;
  border: 1px solid rgba(0,0,0,0.06);
}
code {
  padding: 0.12em 0.25em;
  border-radius: 3px;
  background: rgba(0,0,0,0.02);
  font-size: 0.95em;
}
"""
    css_text += "\n" + extra
    (page_path / "stylesheet.css").write_text(css_text, encoding="utf-8")

    update_root_index(page_path, title)

    print(f"HTML: {page_path / 'index.html'}")
    print(f"CSS: {page_path / 'stylesheet.css'}")

if __name__ == "__main__":
    main()