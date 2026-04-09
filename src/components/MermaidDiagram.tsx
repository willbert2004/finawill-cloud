import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#1e293b',
    primaryBorderColor: '#2563eb',
    secondaryColor: '#f1f5f9',
    tertiaryColor: '#e2e8f0',
    lineColor: '#64748b',
    textColor: '#334155',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
  },
  flowchart: { curve: 'basis', padding: 15, nodeSpacing: 50, rankSpacing: 50 },
  er: { fontSize: 12, layoutDirection: 'TB', minEntityWidth: 100 },
  sequence: { actorMargin: 60, messageFontSize: 13, noteMargin: 15, mirrorActors: false, width: 180 },
  class: { defaultRenderer: 'dagre-wrapper' },
});

let idCounter = 0;

interface MermaidDiagramProps {
  chart: string;
  title?: string;
}

const MermaidDiagram = ({ chart, title }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const idRef = useRef(`mermaid-${++idCounter}-${Date.now()}`);

  useEffect(() => {
    const renderChart = async () => {
      try {
        const { svg } = await mermaid.render(idRef.current, chart);
        setSvg(svg);
        setError('');
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setError(err?.message || 'Failed to render diagram');
      }
    };
    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5 text-sm text-destructive">
        <p className="font-medium">Diagram rendering error</p>
        <p className="text-xs mt-1 opacity-70">{error}</p>
      </div>
    );
  }

  return (
    <div className="print:break-inside-avoid my-4">
      {title && (
        <p className="text-sm font-semibold text-foreground mb-2 text-center">{title}</p>
      )}
      <div
        ref={containerRef}
        className="overflow-x-auto bg-card border border-border rounded-lg p-4 flex justify-center [&_svg]:w-full [&_svg]:max-w-none"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
};

export default MermaidDiagram;
