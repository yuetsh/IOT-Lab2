import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'base',
  themeVariables: {
    primaryColor: '#6366f1',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#4f46e5',
    lineColor: '#64748b',
    secondaryColor: '#06b6d4',
    tertiaryColor: '#f8fafc',
    background: '#ffffff',
    mainBkg: '#6366f1',
    nodeBorder: '#4f46e5',
    clusterBkg: '#f1f5f9',
    clusterBorder: '#cbd5e1',
    titleColor: '#1e293b',
    edgeLabelBackground: '#1e293b',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  }
})

let renderCount = 0

interface Props {
  code: string
  style?: React.CSSProperties
  onRender?: (svg: SVGSVGElement | null) => void
}

export default function MermaidRenderer({ code, style, onRender }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !code.trim()) return
    let cancelled = false
    const id = `mermaid-${++renderCount}`
    mermaid.render(id, code).then(({ svg }) => {
      if (cancelled) return
      if (ref.current) ref.current.innerHTML = svg
      onRender?.(ref.current?.querySelector('svg') ?? null)
    }).catch(() => {
      if (cancelled) return
      if (ref.current) ref.current.innerHTML = '<p style="color:red">流程图语法错误</p>'
      onRender?.(null)
    })

    return () => {
      cancelled = true
    }
  }, [code, onRender])

  return <div ref={ref} style={{ width: '100%', ...style }} />
}
