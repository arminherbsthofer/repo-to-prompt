const express = require('express');
const axios = require('axios');
const app = express();

// Middleware to serve static files
app.use(express.static('public'));

// Function to escape HTML characters for display
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')  // Must be first to avoid double-escaping
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper function to parse repo details from URL
function parseRepoUrl(url) {
  const parts = url.split('/').filter(Boolean);
  const githubIndex = parts.indexOf('github.com');
  if (githubIndex === -1 || githubIndex + 1 >= parts.length) {
    throw new Error('Invalid GitHub URL');
  }
  
  const owner = parts[githubIndex + 1];
  const repo = parts[githubIndex + 2];
  let branch = null;

  if (parts[githubIndex + 3] === 'tree' && parts[githubIndex + 4]) {
    branch = parts[githubIndex + 4];
  }

  return { owner, repo, branch };
}

// Helper function to generate the prompt
async function generatePrompt(owner, repo, branch, token) {
  const headers = token ? { 'Authorization': `token ${token}` } : {};

  // Get repository info to find the default branch if not provided
  const repoInfo = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  const defaultBranch = branch || repoInfo.data.default_branch;

  // Get the repository tree
  const treeResponse = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    { headers }
  );
  const tree = treeResponse.data.tree;

  // Build the nested tree structure
  function buildNestedTree(treeItems) {
    const root = { children: [] };
    const pathMap = { '': root };

    for (const item of treeItems) {
      const parts = item.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const fullPath = parts.slice(0, i + 1).join('/');
        if (!pathMap[fullPath]) {
          const dir = { name: part, children: [] };
          current.children.push(dir);
          pathMap[fullPath] = dir;
        }
        current = pathMap[fullPath];
      }

      if (item.type === 'blob') {
        current.children.push({ name: parts[parts.length - 1], path: item.path });
      }
    }
    return root;
  }

  // Generate tree text representation
  function generateTreeText(node, prefix = '') {
    let result = '';
    const sortedChildren = node.children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of sortedChildren) {
      result += `${prefix}- ${child.name}\n`;
      if (child.children) {
        result += generateTreeText(child, prefix + '--');
      }
    }
    return result;
  }

  const nestedTree = buildNestedTree(tree);
  const fileStructure = 'Repository Structure: \n\n' + generateTreeText(nestedTree);

  // Define code file extensions and names
  const codeExtensions = [
    '.js', '.html', '.css', '.py', '.java', '.ts', '.jsx', '.tsx', '.json', '.yml', '.yaml', '.md'
  ];
  const codeFileNames = ['Dockerfile']; // Exact file names to include
  const codeFiles = tree.filter(item =>
    item.type === 'blob' &&
    (codeExtensions.some(ext => item.path.endsWith(ext)) || codeFileNames.includes(item.path.split('/').pop()))
  );

  // Fetch contents of code files as raw text
  const contentHeaders = token
    ? { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3.raw' }
    : { 'Accept': 'application/vnd.github.v3.raw' };
  const fileContents = await Promise.all(
    codeFiles.map(async file => {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${defaultBranch}`,
        {
          headers: contentHeaders,
          responseType: 'text' // Force raw text response
        }
      );
      return { path: file.path, content: response.data };
    })
  );

  // Generate the final text prompt (raw content)
  let textPrompt = fileStructure + '\n';
  for (const file of fileContents) {
    textPrompt += `=== ${file.path} ===\n\n${file.content}\n\n`;
  }

  return textPrompt;
}

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Route to handle URL query parameters
app.get('/generate', async (req, res) => {
  const repoUrl = req.query.url;
  const token = req.query.token;

  if (!repoUrl) {
    return res.status(400).send('Error: Repository URL is required');
  }

  try {
    const { owner, repo, branch } = parseRepoUrl(repoUrl);
    const textPrompt = await generatePrompt(owner, repo, branch, token);
    // Escape the entire prompt for safe display
    const escapedPrompt = escapeHtml(textPrompt);
    res.send(`<pre>${escapedPrompt}</pre>`);
  } catch (error) {
    res.status(400).send(`Error: ${error.response?.data?.message || error.message}`);
  }
});

// Start the server
app.listen(7777, () => console.log('Server running on port 7777'));
