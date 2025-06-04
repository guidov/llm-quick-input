// Live test of both providers with the fixed rendering
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

// Updated rendering function with <think> block filtering
function renderMarkdown(text) {
    try {
        // First, remove any reasoning blocks (like <think>...</think>) that might interfere
        let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
        
        // Then, render LaTeX expressions with multiple delimiter formats
        let withMath = cleanText
            // Handle \[...\] (display math) - OpenAI format
            .replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
                try {
                    return katex.renderToString(latex.trim(), { displayMode: true });
                } catch (e) {
                    console.warn('Failed to render display LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            })
            // Handle \(...\) (inline math) - OpenAI format
            .replace(/\\\(([\s\S]*?)\\\)/g, (match, latex) => {
                try {
                    return katex.renderToString(latex.trim(), { displayMode: false });
                } catch (e) {
                    console.warn('Failed to render inline LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            })
            // Handle $$...$$ (display math) - Traditional format
            .replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
                try {
                    return katex.renderToString(latex.trim(), { displayMode: true });
                } catch (e) {
                    console.warn('Failed to render $$ LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            })
            // Handle $...$ (inline math) - Traditional format
            .replace(/\$([^$\n]+?)\$/g, (match, latex) => {
                try {
                    return katex.renderToString(latex.trim(), { displayMode: false });
                } catch (e) {
                    console.warn('Failed to render $ LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            });
        
        // Then render markdown
        return marked.parse(withMath);
    } catch (error) {
        console.error('Error rendering markdown:', error);
        return text; // Return original text if parsing fails
    }
}

async function testOpenAI() {
    if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  OpenAI API key not found');
        return;
    }
    
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('🤖 Testing OpenAI with math equation request...');
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: "user", content: "Write Einstein's mass-energy equation with **bold** description" }],
            max_tokens: 150,
        });

        const response = completion.choices[0].message.content;
        console.log('\n📝 OpenAI Response:\n', response);
        
        const rendered = renderMarkdown(response);
        console.log('\n✨ Rendered (contains KaTeX):', rendered.includes('<span class="katex">'));
        console.log('✨ Contains bold formatting:', rendered.includes('<strong>'));
        
        return rendered;
    } catch (error) {
        console.error('❌ OpenAI Error:', error.message);
    }
}

async function testOllama() {
    try {
        console.log('\n🦙 Testing Ollama with math equation request...');
        
        const response = await axios.post('http://localhost:11434/api/generate', {
            model: 'deepseek-r1:1.5b',
            prompt: "Write Einstein's mass-energy equation with **bold** description",
            stream: false
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        const ollamaResponse = response.data.response;
        console.log('\n📝 Ollama Response:\n', ollamaResponse);
        
        const rendered = renderMarkdown(ollamaResponse);
        console.log('\n✨ Rendered (contains KaTeX):', rendered.includes('<span class="katex">'));
        console.log('✨ Contains bold formatting:', rendered.includes('<strong>'));
        console.log('✨ Think blocks filtered:', !rendered.includes('<think>'));
        
        return rendered;
    } catch (error) {
        console.error('❌ Ollama Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure Ollama is running with: ollama serve');
        }
    }
}

async function runTest() {
    console.log('🎯 Testing LaTeX and Markdown Rendering Fix\n');
    console.log('=' * 50);
    
    const openaiResult = await testOpenAI();
    const ollamaResult = await testOllama();
    
    console.log('\n📊 FINAL RESULTS:');
    console.log('OpenAI LaTeX working:', openaiResult?.includes('<span class="katex">') || false);
    console.log('Ollama LaTeX working:', ollamaResult?.includes('<span class="katex">') || false);
    console.log('Both providers fixed:', 
        (openaiResult?.includes('<span class="katex">') || false) && 
        (ollamaResult?.includes('<span class="katex">') || false)
    );
    
    console.log('\n🎉 Test complete! Both providers should now render LaTeX and markdown correctly.');
}

runTest().catch(console.error);
