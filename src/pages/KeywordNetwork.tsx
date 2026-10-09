import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useStore } from '../lib/store'
import type { Keyword } from '../types'

interface D3Node extends d3.SimulationNodeDatum {
  id: string
  name: string
  weight: number // total connections
  paperCount: number
  varCount: number
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  strength: number
}

export default function KeywordNetwork() {
  const { keywords, papers, variables, syncKeywords } = useStore()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState<(Keyword & { papers: string[]; vars: string[] }) | null>(null)

  useEffect(() => { syncKeywords() }, [papers.length, variables.length])

  useEffect(() => {
    if (!svgRef.current || keywords.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = svgRef.current.clientWidth || 800
    const H = svgRef.current.clientHeight || 600

    const g = svg.append('g')

    // Build nodes
    const nodes: D3Node[] = keywords.map((kw) => ({
      id: kw.id,
      name: kw.name,
      weight: kw.paper_ids.length + kw.variable_ids.length,
      paperCount: kw.paper_ids.length,
      varCount: kw.variable_ids.length,
    }))

    // Build links: connect keywords that share papers or variables
    const linkMap = new Map<string, number>()
    keywords.forEach((kw) => {
      keywords.forEach((kw2) => {
        if (kw.id >= kw2.id) return
        const shared =
          kw.paper_ids.filter((p) => kw2.paper_ids.includes(p)).length +
          kw.variable_ids.filter((v) => kw2.variable_ids.includes(v)).length
        if (shared > 0) {
          linkMap.set(`${kw.id}__${kw2.id}`, shared)
        }
      })
    })

    const links: D3Link[] = Array.from(linkMap.entries()).map(([key, strength]) => {
      const [source, target] = key.split('__')
      return { source, target, strength }
    })

    const maxWeight = Math.max(...nodes.map((n) => n.weight), 1)
    const maxLink = Math.max(...links.map((l) => l.strength), 1)

    const radius = (n: D3Node) => Math.max(8, 8 + (n.weight / maxWeight) * 32)
    const colorScale = d3.scaleSequential(d3.interpolateCool).domain([0, maxWeight])

    // Zoom
    svg.call(
      d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on('zoom', (e) => {
        g.attr('transform', e.transform)
      })
    )

    // Simulation
    const sim = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links).id((d) => d.id).distance((l) => 120 - l.strength * 10).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide<D3Node>().radius((d) => radius(d) + 6))

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => 1 + (d.strength / maxLink) * 5)

    // Nodes
    const node = g.append('g')
      .selectAll<SVGGElement, D3Node>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, D3Node>()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    node.append('circle')
      .attr('r', (d) => radius(d))
      .attr('fill', (d) => colorScale(d.weight))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('fill-opacity', 0.85)
      .on('mouseenter', (_, d) => {
        const kw = keywords.find((k) => k.id === d.id)
        if (!kw) return
        const paperNames = kw.paper_ids.map((pid) => papers.find((p) => p.id === pid)?.title || pid)
        const varNames = kw.variable_ids.map((vid) => variables.find((v) => v.id === vid)?.name || vid)
        setHovered({ ...kw, papers: paperNames, vars: varNames })
        d3.select((_.currentTarget as SVGCircleElement).parentNode as SVGGElement)
          .select('circle').attr('stroke', '#3b82f6').attr('stroke-width', 3)
      })
      .on('mouseleave', (e) => {
        setHovered(null)
        d3.select((e.currentTarget as SVGCircleElement).parentNode as SVGGElement)
          .select('circle').attr('stroke', 'white').attr('stroke-width', 2)
      })

    node.append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => radius(d) + 13)
      .attr('font-size', (d) => Math.max(10, 10 + (d.weight / maxWeight) * 4))
      .attr('fill', '#374151')
      .attr('font-weight', '500')
      .style('pointer-events', 'none')

    sim.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as D3Node).x!)
        .attr('y1', (d) => (d.source as D3Node).y!)
        .attr('x2', (d) => (d.target as D3Node).x!)
        .attr('y2', (d) => (d.target as D3Node).y!)
      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    return () => { sim.stop() }
  }, [keywords.length])

  return (
    <div className="relative flex-1 w-full h-full bg-gray-50">
      {keywords.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <NetworkIcon />
          <p className="mt-3 text-sm">尚無關鍵詞，請先在文獻庫或變數中加入關鍵詞</p>
        </div>
      ) : (
        <>
          <svg ref={svgRef} className="w-full h-full" />
          <div className="absolute top-4 left-4 bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-xs text-gray-500">
            <div className="font-semibold text-gray-700 mb-1">說明</div>
            <div>圓圈大小 = 連結數量</div>
            <div>線條粗細 = 共現強度</div>
            <div className="mt-1 text-gray-400">可拖拉節點 · 滾輪縮放</div>
          </div>
        </>
      )}

      {hovered && (
        <div className="absolute top-4 right-4 bg-white rounded-xl shadow-lg border border-gray-100 p-4 w-64 text-sm">
          <div className="font-bold text-gray-800 mb-2 text-base">{hovered.name}</div>
          {hovered.papers.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-gray-500 mb-1">出現文獻 ({hovered.papers.length})</div>
              {hovered.papers.map((p, i) => <div key={i} className="text-xs text-gray-600 truncate">· {p}</div>)}
            </div>
          )}
          {hovered.vars.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">相關變數 ({hovered.vars.length})</div>
              {hovered.vars.map((v, i) => <div key={i} className="text-xs text-gray-600">· {v}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NetworkIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-300">
      <circle cx="12" cy="5" r="2" strokeWidth={1.5} />
      <circle cx="5" cy="19" r="2" strokeWidth={1.5} />
      <circle cx="19" cy="19" r="2" strokeWidth={1.5} />
      <line x1="12" y1="7" x2="5" y2="17" strokeWidth={1.5} />
      <line x1="12" y1="7" x2="19" y2="17" strokeWidth={1.5} />
      <line x1="5" y1="19" x2="19" y2="19" strokeWidth={1.5} />
    </svg>
  )
}
