/**
 * Hiển thị chuỗi từ AI có dùng **in đậm** (markdown-lite).
 */
export function FormattedCompareText({ text, className = '' }) {
  if (text == null || text === '') return null;
  const s = String(text);
  const nodes = [];
  let ki = 0;
  let last = 0;
  const re = /\*\*(.+?)\*\*/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      nodes.push(<span key={ki++}>{s.slice(last, m.index)}</span>);
    }
    nodes.push(
      <strong key={ki++} className="font-semibold text-primary">
        {m[1]}
      </strong>
    );
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    nodes.push(<span key={ki++}>{s.slice(last)}</span>);
  }
  return <span className={`whitespace-pre-wrap ${className}`.trim()}>{nodes}</span>;
}
