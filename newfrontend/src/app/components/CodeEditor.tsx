import { Textarea } from "./ui/textarea";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  fontSize?: number;
  tabSize?: number;
}

export default function CodeEditor({ value, language, onChange, fontSize = 14, tabSize = 2 }: CodeEditorProps) {
  const lines = value.split('\n');
  const lineCount = lines.length;

  return (
    <div className="h-full flex bg-[#1e1e1e] font-mono overflow-hidden" style={{ fontSize: `${fontSize}px` }}>
      {/* Line Numbers */}
      <div className="bg-[#1e1e1e] text-[#858585] py-4 px-3 select-none border-r border-[#3e3e42] min-w-[50px] text-right">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1} className="leading-6">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Code Area */}
      <div className="flex-1 relative overflow-auto">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full bg-transparent border-0 text-white font-mono resize-none focus:outline-none focus:ring-0 p-4 leading-6 min-h-full"
          style={{
            caretColor: 'white',
            tabSize,
          }}
          spellCheck={false}
        />
        
        {/* Syntax highlighting overlay (simplified visual representation) */}
        <div className="absolute inset-0 pointer-events-none p-4 leading-6 overflow-hidden">
          {lines.map((line, index) => (
            <div key={index} className="whitespace-pre" style={{ color: 'transparent' }}>
              {highlightSyntax(line)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Simple syntax highlighting (visual representation)
function highlightSyntax(line: string) {
  // Keywords
  const keywords = ['import', 'export', 'default', 'function', 'const', 'let', 'var', 'return', 'if', 'else', 'from', 'class', 'interface', 'type'];
  
  let highlighted = line;
  
  // This is a simplified representation - in a real editor you'd use a proper syntax highlighter
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    highlighted = highlighted.replace(regex, `<span style="color: #C586C0">${keyword}</span>`);
  });

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
}
