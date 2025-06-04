// Test the updated rendering function with <think> blocks
const marked = require('marked');
const katex = require('katex');

// Configure marked
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
});

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

// Test with OpenAI-style response (no <think> blocks)
const openaiResponse = `The quadratic formula is given by:

\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]

where \\(a\\), \\(b\\), and \\(c\\) are coefficients of the quadratic equation \\(ax^2 + bx + c = 0\\).`;

// Test with Ollama-style response (with <think> blocks)
const ollamaResponse = `<think>
First, I need to identify the general form of a quadratic equation.

The standard form of a quadratic equation is \\( ax^2 + bx + c = 0 \\), where \\( a \\), \\( b \\), and \\( c \\) are coefficients, and \\( x \\) is the variable.

Next, I should recall the quadratic formula.

The quadratic formula provides the solutions for the variable in terms of the coefficients:
\\[
x = \\frac{ -b \\pm \\sqrt{b^2 - 4ac} }{ 2a }
\\]

Finally, I will write out the quadratic formula in a clear and properly formatted LaTeX equation.
</think>

To solve a quadratic equation of the form \\( ax^2 + bx + c = 0 \\), we use the **quadratic formula**:

\\[
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
\\]

Here, \\( a \\), \\( b \\), and \\( c \\) are coefficients from the quadratic equation. The solutions for \\( x \\) can be found by evaluating this formula.

**Final Answer:**
\\[
\\boxed{x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}}
\\]`;

console.log('🧪 TESTING UPDATED RENDERER\n');
console.log('=' * 50);

console.log('\n🤖 OpenAI-style response test:');
console.log('Input contains <think>:', openaiResponse.includes('<think>'));
const openaiRendered = renderMarkdown(openaiResponse);
console.log('✅ Rendered successfully:', openaiRendered.includes('<span class="katex">'));
console.log('LaTeX found:', openaiRendered.includes('katex'));
console.log('Markdown found:', openaiRendered.includes('<strong>') || openaiRendered.includes('<em>'));

console.log('\n🦙 Ollama-style response test:');
console.log('Input contains <think>:', ollamaResponse.includes('<think>'));
const ollamaRendered = renderMarkdown(ollamaResponse);
console.log('✅ Rendered successfully:', ollamaRendered.includes('<span class="katex">'));
console.log('LaTeX found:', ollamaRendered.includes('katex'));
console.log('Markdown found:', ollamaRendered.includes('<strong>') || ollamaRendered.includes('<em>'));
console.log('Think blocks removed:', !ollamaRendered.includes('<think>'));

console.log('\n📊 SUMMARY:');
console.log('OpenAI rendering works:', openaiRendered.includes('katex'));
console.log('Ollama rendering works:', ollamaRendered.includes('katex'));
console.log('Think blocks properly filtered:', !ollamaRendered.includes('<think>'));

console.log('\n🎯 Test complete!');
