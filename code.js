// Code Examples

// Each function returns code example for that language with YOUR_API_KEY, sourceURL injected

function swiftCode(YOUR_API_KEY, sourceURL) {
    return `
import Foundation

actor AudioShakeClient {
    private let apiKey = "${YOUR_API_KEY}"
    private let baseURL = "https://api.audioshake.ai"
    
    struct TaskResponse: Decodable {
        let id: String
        let status: String?
        let targets: [Target]?
        
        struct Target: Decodable {
            let status: String
            let output: [Output]
            
            struct Output: Decodable {
                let link: String
            }
        }
    }
    
    func align(videoURL: String) async throws -> String {
        let taskID = try await createTask(videoURL: videoURL)
        print("Task created: \\(taskID)")
        
        while true {
            let response = try await getStatus(taskID: taskID)
            
            guard let targets = response.targets else {
                throw AudioShakeError.noResult
            }
            
            let allComplete = targets.allSatisfy { $0.status == "completed" }
            let anyFailed = targets.contains { $0.status == "failed" || $0.status == "error" }
            
            if anyFailed {
                throw AudioShakeError.taskFailed
            }
            
            if allComplete {
                guard let resultURL = targets.first?.output.first?.link else {
                    throw AudioShakeError.noResult
                }
                return resultURL
            }
            
            print("Status: processing...")
            try await Task.sleep(for: .seconds(5))
        }
    }
    
    private func createTask(videoURL: String) async throws -> String {
        let body: [String: Any] = [
            "url": videoURL,
            "targets": [[
                "model": "alignment",
                "formats": ["json"],
                "language": "en"
            ]]
        ]
        
        var request = URLRequest(url: URL(string: "\\(baseURL)/tasks")!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(TaskResponse.self, from: data)
        return response.id
    }
    
    private func getStatus(taskID: String) async throws -> TaskResponse {
        var request = URLRequest(url: URL(string: "\\(baseURL)/tasks/\\(taskID)")!)
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(TaskResponse.self, from: data)
    }
    
    enum AudioShakeError: Error {
        case taskFailed, noResult
    }
}

Task {
    do {
        let client = AudioShakeClient()
        let resultURL = try await client.align(videoURL: "${sourceURL}")
        print("✅ Result: \\(resultURL)")
    } catch let error as URLError {
        print("❌ Network Error: \\(error.localizedDescription)")
    } catch let error as DecodingError {
        print("❌ Decoding Error: \\(error)")
    } catch let error as AudioShakeClient.AudioShakeError {
        print("❌ AudioShake Error: \\(error)")
    } catch {
        print("❌ Error: \\(error.localizedDescription)")
        print("Full error: \\(error)")
    }
}

import PlaygroundSupport
PlaygroundPage.current.needsIndefiniteExecution = true
`;
}

function javascriptCode(YOUR_API_KEY, sourceURL) {
    return `// Define checkStatus BEFORE using it

const checkStatus = async (taskId) => {
    
    const response = await fetch(\`https://api.audioshake.ai/tasks/\${taskId}\`, {
        headers: { 'x-api-key': '${YOUR_API_KEY}' }
    });
    const task = await response.json();
    
    // Find alignment target
    const alignmentTarget = task.targets.find(t => t.model === 'alignment');
    if (alignmentTarget && alignmentTarget.status === 'completed') {
        const output = alignmentTarget.output.find(o => o.format === 'json');
        console.log('Alignment URL:', output.link);
    }
    return task;
};

// Create alignment task
const response = await fetch('https://api.audioshake.ai/tasks', {
    method: 'POST',
    headers: {
        'x-api-key': '${YOUR_API_KEY}',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        url: '${sourceURL}',
        targets: [
            {
                model: 'alignment',
                formats: ['json'],
                language: 'en'
            }
        ]
    })
});

const task = await response.json();
console.log('Full response:', task); // Log full response to debug
console.log('Task ID:', task.id);

if (task.id) {
    const pollResult = await checkStatus(task.id);
    console.log('Running Task ID:', pollResult.id);
} else {
    console.error('No task ID received. Check API response:', task);
}
`
}

function nodeCode(YOUR_API_KEY, sourceURL) {
    return `
/**
 * NodeJS Polling example test.mjs 
 * requires Node v18+
 */

// Create alignment task and poll for completion
const API_KEY = '${YOUR_API_KEY}';
const SourceURL = '${sourceURL}';

// Helper function to check task status
async function getTaskStatus(taskId) {
    const response = await fetch(\`https://api.audioshake.ai/tasks/\${taskId}\`, {
        headers: { 'x-api-key': API_KEY }
    });
    
    if (!response.ok) {
        throw new Error(\`Failed to get task status: \${response.status}\`);
    }
    
    return await response.json();
}

// Polling function
async function pollTask(taskId, maxAttempts = 60, interval = 5000) {
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
        const poll = async () => {
            try {
                attempts++;
                console.log(\`📊 Polling attempt \${attempts}/\${maxAttempts}...\`);
                
                const task = await getTaskStatus(taskId);
                
                // Find the alignment target
                const target = task.targets?.find(t => t.model === 'alignment');
                
                if (!target) {
                    reject(new Error('No alignment target found'));
                    return;
                }
                
                console.log(\`   Status: \${target.status}\`);
                if (target.duration) {
                    console.log(\`   Duration: \${target.duration.toFixed(2)}s\`);
                }
                
                if (target.status === 'completed') {
                    console.log('✅ Task completed!');
                    resolve(task);
                } else if (target.status === 'failed') {
                    reject(new Error(target.error || 'Task failed'));
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Polling timeout - task still processing'));
                } else {
                    setTimeout(poll, interval);
                }
            } catch (err) {
                reject(err);
            }
        };
        
        poll();
    });
}

// Main execution
(async () => {
    try {
        // Step 1: Create the task
        console.log('🚀 Creating alignment task...');
        const response = await fetch('https://api.audioshake.ai/tasks', {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: SourceURL,
                targets: [
                    {
                        model: 'alignment',
                        formats: ['json'],
                        language: 'en'
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(\`API Error (\${response.status}): \${errorText}\`);
        }

        const task = await response.json();
        console.log('✅ Task created successfully!');
        console.log('📝 Task ID:', task.id);
        console.log('');

        // Step 2: Poll for completion
        console.log('⏳ Waiting for task to complete...');
        const completedTask = await pollTask(task.id);
        
        // Step 3: Get the result
        const alignmentTarget = completedTask.targets.find(t => t.model === 'alignment');
        const output = alignmentTarget.output.find(o => o.format === 'json');
        
        console.log('');
        console.log('🎉 Success!');
        console.log('📥 Alignment JSON URL:', output.link);
        console.log('💰 Cost:', alignmentTarget.cost, 'credits');
        console.log(\`⏱️  Duration: \${alignmentTarget.duration.toFixed(2)} seconds\`);
        
        // Optional: Fetch the alignment data
        console.log('');
        console.log('📄 Fetching alignment data...');
        const alignmentResponse = await fetch(output.link);
        const alignmentData = await alignmentResponse.json();
        console.log('Alignment data:', JSON.stringify(alignmentData, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
})();
`
}

function curlCode(YOUR_API_KEY, sourceURL) {
    return `# Create alignment task
curl - X POST https://api.audioshake.ai/tasks \\
-H "x-api-key: ${YOUR_API_KEY}" \\
-H "Content-Type: application/json" \\
-d '{
"url": "${sourceURL}",
    "targets": [
        {
            "model": "alignment",
            "formats": ["json"],
            "language": "en"
        }
    ]
  }'

# Get task status
curl https://api.audioshake.ai/tasks/TASK_ID \\
-H "x-api-key: ${YOUR_API_KEY}"`
}

function pythonCode(YOUR_API_KEY, sourceURL) {
    return `
import requests
import time

# Create alignment task
response = requests.post(
    'https://api.audioshake.ai/tasks',
    headers={
        'x-api-key': '${YOUR_API_KEY}',
        'Content-Type': 'application/json'
    },
    json={
        'url': '${sourceURL}',
        'targets': [
            {
                'model': 'alignment',
                'formats': ['json'],
                'language': 'en'
            }
        ]
    }
)

task = response.json()
task_id = task['id']

# Poll for completion
while True:
    status = requests.get(
        f'https://api.audioshake.ai/tasks/{task_id}',
        headers={'x-api-key': '${YOUR_API_KEY}'}
    ).json()
    
    # Find alignment target
    alignment_target = next(t for t in status['targets'] if t['model'] == 'alignment')
    
    if alignment_target['status'] == 'completed':
        output = next(o for o in alignment_target['output'] if o['format'] == 'json')
        print('Alignment URL:', output['link'])
        break
    
    time.sleep(2)`;
}
function updateCodeExample(lang) {
    let YOUR_API_KEY = (api.hasAPIKey) ? api.apiKey : "YOUR_API_KEY";
    let sourceURL = (state.selectedAsset != undefined) ? state.selectedAsset.src : 'https://example.com/audio.mp3'

    console.log('CODE TEST*****************\n', swiftCode(YOUR_API_KEY, sourceURL), "\n **************")

    const examples = {
        swift: swiftCode(YOUR_API_KEY, sourceURL),
        javascript: javascriptCode(YOUR_API_KEY, sourceURL),
        node: nodeCode(YOUR_API_KEY, sourceURL),
        curl: curlCode(YOUR_API_KEY, sourceURL),
        python: pythonCode(YOUR_API_KEY, sourceURL)
    };

    elements.codeContent.textContent = examples[lang] || examples.javascript;
}

function copyCode() {
    const code = elements.codeContent.textContent;
    navigator.clipboard.writeText(code).then(() => {
        const originalText = elements.copyCodeBtn.textContent;
        elements.copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => {
            elements.copyCodeBtn.textContent = originalText;
        }, 2000);
    });
}


