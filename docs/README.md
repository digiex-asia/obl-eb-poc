# MkDocs Setup Instructions

This project uses [MkDocs](https://www.mkdocs.org/) with the [Material theme](https://squidfunk.github.io/mkdocs-material/) for documentation.

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Install MkDocs and Dependencies

```bash
# Install dependencies
pip install -r requirements.txt

# Or install directly
pip install mkdocs mkdocs-material mkdocstrings[python]
```

## Usage

### Serve Documentation Locally

Start the development server to preview documentation:

```bash
mkdocs serve
```

The documentation will be available at `http://127.0.0.1:8000`

### Build Documentation

Build static HTML files:

```bash
mkdocs build
```

The generated site will be in the `site/` directory.

### Deploy Documentation

Deploy to GitHub Pages:

```bash
mkdocs gh-deploy
```

Or deploy to any static hosting service by uploading the `site/` directory.

## Documentation Structure

```
docs/
├── index.md           # Homepage
├── CanvasEditor.md    # CanvasEditor documentation
└── KonvaEditor.md     # KonvaEditor documentation
```

## Configuration

The MkDocs configuration is in `mkdocs.yml` at the project root. Key settings:

- **Theme**: Material theme with light/dark mode
- **Navigation**: Configured in `nav` section
- **Plugins**: Search and code annotations enabled
- **Markdown Extensions**: Code highlighting, tables, TOC, and more

## Adding New Documentation

1. Create a new Markdown file in the `docs/` directory
2. Add it to the `nav` section in `mkdocs.yml`
3. Use standard Markdown syntax
4. Code blocks are automatically highlighted

## Customization

Edit `mkdocs.yml` to customize:
- Site name and description
- Theme colors and features
- Navigation structure
- Plugins and extensions













