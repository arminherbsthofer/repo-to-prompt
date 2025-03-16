# GitHub Repo to Text Prompt

This is a Node.js-based web tool that converts a GitHub repository into a single text prompt. It displays the repository's file structure in a tree-like format and includes the raw contents of code files, making it easy to copy and paste the output for further use. The tool is containerized with Docker and supports both public and private repositories via URL query parameters.

## Features

- **File Structure**: Displays the repository's directory tree (e.g., `- src -- index.js`).
- **Raw File Contents**: Includes the exact contents of code files (e.g., `.js`, `.html`, `.json`, `Dockerfile`) without modification.
- **Copy-Friendly Output**: All content is escaped for safe display in the browser but can be copied as raw text.
- **Branch Support**: Optionally specify a branch in the URL (e.g., `/tree/branch-name`).
- **Private Repos**: Supports private repositories with a GitHub personal access token.
- **Dockerized**: Runs in a container for easy deployment.

## Prerequisites

- **Docker**: Required to build and run the container.
- **Docker Compose**: Used to manage the application.
- **GitHub Token (Optional)**: Needed for private repositories (must have `repo` scope).

## Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/arminherbsthofer/repo-to-prompt.git
   cd repo-to-prompt
