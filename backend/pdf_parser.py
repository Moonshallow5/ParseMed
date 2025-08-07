import fitz  # PyMuPDF
import re
import pdfplumber


def normalize_header(header):
    header = header.lower()
    if header in ["result", "results"]:
        return "results"
    if header in ["conclusion", "conclusions"]:
        return "conclusions"
    if header in ["method", "methods"]:
        return "methods"
    # Add more as needed
    return header

def extract_sections(path):
    doc = fitz.open(path)
    text = "\n".join(page.get_text() for page in doc)

    # More flexible pattern for section headers (single backslash!)
    pattern = r'(?:^|\n|\r|\f|\s+)(objective|introduction|background|methods?|results?|conclusion|keywords)(?=\s|:|\n|\r|\f|$)'
    chunks = re.split(pattern, text, flags=re.IGNORECASE)
    sections = {}
    for i in range(1, len(chunks), 2):
        header = normalize_header(chunks[i].strip())
        content = chunks[i+1].strip()
        if header not in sections:
            sections[header] = []
        sections[header].append(content)

    return sections
