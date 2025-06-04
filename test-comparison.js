// Test script to compare OpenAI and Ollama response formats
const axios = require('axios');
const { OpenAI } = require('openai');
const marked = require('marked');
const katex = require('katex');
require('dotenv').config();

// Configure marked
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
});

// Our rendering function (same as in main.js)
function renderMarkdown(text) {
    try {
        console.log('\n=== RENDERING DEBUG ===');
        console.log('Original text:', text.substring(0, 200) + '...');
        console.log('Looking for LaTeX patterns...');
        
        // First, render LaTeX expressions with multiple delimiter formats
        let withMath = text
            // Handle \[...\] (display math) - OpenAI format
            .replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
                console.log('Found \\[...\\] LaTeX:', latex.trim());
                try {
                    const rendered = katex.renderToString(latex.trim(), { displayMode: true });
                    console.log('Successfully rendered \\[...\\]');
                    return rendered;
                } catch (e) {
                    console.warn('Failed to render display LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            })
            // Handle \(...\) (inline math) - OpenAI format
            .replace(/\\\(([\s\S]*?)\\\)/g, (match, latex) => {
                console.log('Found \\(...\\) LaTeX:', latex.trim());
                try {
                    const rendered = katex.renderToString(latex.trim(), { displayMode: false });
                    console.log('Successfully rendered \\(...\\)');
                    return rendered;
                } catch (e) {
                    console.warn('Failed to render inline LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            })
            // Handle $$...$$ (display math) - Traditional format
            .replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
                console.log('Found $$...$$ LaTeX:', latex.trim());
                try {
                    const rendered = katex.renderToString(latex.trim(), { displayMode: true });
                    console.log('Successfully rendered $$...$$');
                    return rendered;
                } catch (e) {
                    console.warn('Failed to render $$ LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            })
            // Handle $...$ (inline math) - Traditional format
            .replace(/\$([^$\n]+?)\$/g, (match, latex) => {
                console.log('Found $...$ LaTeX:', latex.trim());
                try {
                    const rendered = katex.renderToString(latex.trim(), { displayMode: false });
                    console.log('Successfully rendered $...$');
                    return rendered;
                } catch (e) {
                    console.warn('Failed to render $ LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            });
        
        console.log('After LaTeX processing:', withMath.substring(0, 200) + '...');
        
        // Then render markdown
        const final = marked.parse(withMath);
        console.log('Final rendered:', final.substring(0, 200) + '...');
        console.log('=== END RENDERING DEBUG ===\n');
        
        return final;
    } catch (error) {
        console.error('Error rendering markdown:', error);
        return text; // Return original text if parsing fails
    }
}

// Test prompts
const testPrompts = [
    "Write the quadratic formula in LaTeX format",
    "Explain the Pythagorean theorem with **bold text** and LaTeX equation",
    "Show me Newton's second law in both inline math $F = ma$ and display math format",
    "Write the Schrödinger equation with proper markdown formatting"
];

async function testOpenAI(prompt) {
    if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  OpenAI API key not found in .env file');
        return null;
    }
    
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        console.log('🤖 Testing OpenAI with prompt:', prompt);
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: "user", content: prompt }],
            max_tokens: 250,
        });

        const response = completion.choices[0].message.content;
        console.log('📝 OpenAI Raw Response:\n', response);
        console.log('\n📊 OpenAI Analysis:');
        console.log('- Contains \\[...\\]:', /\\\[[\s\S]*?\\\]/.test(response));
        console.log('- Contains \\(...\\):', /\\\([\s\S]*?\\\)/.test(response));
        console.log('- Contains $$...$$:', /\$\$[\s\S]*?\$\$/.test(response));
        console.log('- Contains $...$:', /\$[^$\n]+?\$/.test(response));
        console.log('- Contains **bold**:', /\*\*[^*]+\*\*/.test(response));
        console.log('- Contains *italic*:', /\*[^*]+\*/.test(response));
        
        const rendered = renderMarkdown(response);
        console.log('🎨 OpenAI Rendered (first 300 chars):\n', rendered.substring(0, 300) + '...\n');
        
        return { raw: response, rendered };
    } catch (error) {
        console.error('❌ OpenAI Error:', error.message);
        return null;
    }
}

async function testOllama(prompt, ollamaUrl = 'http://localhost:11434', model = 'deepseek-r1:1.5b') {
    try {
        console.log('🦙 Testing Ollama with prompt:', prompt);
        
        const response = await axios.post(`${ollamaUrl}/api/generate`, {
            model: model,
            prompt: prompt,
            stream: false
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        const ollamaResponse = response.data.response;
        console.log('📝 Ollama Raw Response:\n', ollamaResponse);
        console.log('\n📊 Ollama Analysis:');
        console.log('- Contains \\[...\\]:', /\\\[[\s\S]*?\\\]/.test(ollamaResponse));
        console.log('- Contains \\(...\\):', /\\\([\s\S]*?\\\)/.test(ollamaResponse));
        console.log('- Contains $$...$$:', /\$\$[\s\S]*?\$\$/.test(ollamaResponse));
        console.log('- Contains $...$:', /\$[^$\n]+?\$/.test(ollamaResponse));
        console.log('- Contains **bold**:', /\*\*[^*]+\*\*/.test(ollamaResponse));
        console.log('- Contains *italic*:', /\*[^*]+\*/.test(ollamaResponse));
        
        const rendered = renderMarkdown(ollamaResponse);
        console.log('🎨 Ollama Rendered (first 300 chars):\n', rendered.substring(0, 300) + '...\n');
        
        return { raw: ollamaResponse, rendered };
    } catch (error) {
        console.error('❌ Ollama Error:', error.message);
        return null;
    }
}

async function runComparison() {
    console.log('🔬 Starting OpenAI vs Ollama Response Format Comparison\n');
    console.log('=' * 60);
    
    for (let i = 0; i < testPrompts.length; i++) {
        const prompt = testPrompts[i];
        console.log(`\n🧪 TEST ${i + 1}: ${prompt}`);
        console.log('─'.repeat(60));
        
        // Test OpenAI
        const openaiResult = await testOpenAI(prompt);
        
        console.log('\n' + '─'.repeat(30));
        
        // Test Ollama
        const ollamaResult = await testOllama(prompt);
        
        console.log('\n' + '🔍 COMPARISON SUMMARY:');
        if (openaiResult && ollamaResult) {
            console.log('✅ Both providers responded successfully');
            
            // Check if both contain LaTeX
            const openaiHasLatex = /\$|\\\[|\\\(/.test(openaiResult.raw);
            const ollamaHasLatex = /\$|\\\[|\\\(/.test(ollamaResult.raw);
            
            if (openaiHasLatex && ollamaHasLatex) {
                console.log('🧮 Both responses contain LaTeX expressions');
            } else if (openaiHasLatex) {
                console.log('🤖 Only OpenAI response contains LaTeX');
            } else if (ollamaHasLatex) {
                console.log('🦙 Only Ollama response contains LaTeX');
            } else {
                console.log('❌ Neither response contains LaTeX expressions');
            }
            
            // Check if both contain markdown
            const openaiHasMarkdown = /\*\*|\*|\#/.test(openaiResult.raw);
            const ollamaHasMarkdown = /\*\*|\*|\#/.test(ollamaResult.raw);
            
            if (openaiHasMarkdown && ollamaHasMarkdown) {
                console.log('📝 Both responses contain markdown formatting');
            } else if (openaiHasMarkdown) {
                console.log('🤖 Only OpenAI response contains markdown');
            } else if (ollamaHasMarkdown) {
                console.log('🦙 Only Ollama response contains markdown');
            }
        }
        
        console.log('\n' + '='.repeat(60));
        
        // Pause between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎯 Comparison complete! Check the output above for patterns.');
}

// Run the comparison
runComparison().catch(console.error);
