const fs = require('fs');
const path = require('path');

const mockFlows = [
  'generate-action-code',
  'generate-command-suggestions', 
  'generate-command-tests',
  'generate-flow-node',
  'generate-shoutout',
  'send-twitch-message',
  'send-discord-message',
  'export-action-to-discord',
  'get-shared-actions',
  'get-shared-action-content',
  'text-to-speech',
  'conversational-response',
  'chat-with-athena',
  'get-chat-history',
  'get-stream-metrics',
  'sync-stream-metrics',
  'run-code',
  'speech-to-text'
];

const flowsDir = 'src/ai/flows';

mockFlows.forEach(flowName => {
  const mockContent = `// Mock ${flowName} for build compatibility
export async function ${flowName.replace(/-/g, '')}(input) {
  return Promise.resolve({});
}

export const ${flowName.replace(/-([a-z])/g, (g) => g[1].toUpperCase())} = ${flowName.replace(/-/g, '')};
`;

  fs.writeFileSync(path.join(flowsDir, `${flowName}.ts`), mockContent);
  console.log(`Created mock for ${flowName}`);
});

// Create tools directory and mock
fs.mkdirSync('src/ai/tools', { recursive: true });
fs.writeFileSync('src/ai/tools/get-twitch-user-tool.ts', `// Mock tool for build compatibility
export const getTwitchUserTool = () => Promise.resolve({});
`);

console.log('All AI mocks created!');