import { useMemo } from 'react'
import { GitBranch } from 'lucide-react'
import styles from './FlowChart.module.css'

/**
 * 核心流程图组件
 *
 * 使用 CSS + SVG 绘制垂直流向的流程图
 * 节点根据 flowSteps 排列，边根据 flowEdges 绘制连线
 *
 * 布局策略：
 *  - 主流程节点沿左侧垂直排列
 *  - 分支节点偏移到右侧
 *  - SVG 覆盖层绘制贝塞尔曲线连线
 */

// 节点尺寸常量
const NODE_W = 160
const NODE_H = 52
const GAP_Y = 28

/**
 * 将节点分配到列
 * 简单策略：找到所有被指向的节点中不在主链上的，分配到右列
 */
function assignColumns(flowSteps, flowEdges) {
  // 构建邻接关系
  const children = {}  // from -> [to, ...]
  const parents = {}   // to -> [from, ...]
  flowEdges.forEach(({ from, to }) => {
    if (!children[from]) children[from] = []
    children[from].push(to)
    if (!parents[to]) parents[to] = []
    parents[to].push(from)
  })

  const col = {}  // nodeId -> column index (0 = main, 1 = branch right)
  const row = {}  // nodeId -> row index

  // 找根节点（没有父节点的）
  const roots = flowSteps.filter((s) => !parents[s.id]).map((s) => s.id)

  const stepIdSet = new Set(flowSteps.map((s) => s.id))

  // BFS 遍历分配行列
  const visited = new Set()
  // 使用 roots 作为起点；如果没有 roots（环图），用第一个节点
  const startNodes = roots.length > 0 ? roots : [flowSteps[0]?.id].filter(Boolean)
  let currentRow = 0

  function bfs(startId, startCol) {
    const queue = [startId]
    const localVisited = new Set()

    while (queue.length > 0) {
      const id = queue.shift()
      if (visited.has(id) || localVisited.has(id)) continue
      visited.add(id)
      localVisited.add(id)

      col[id] = startCol
      row[id] = currentRow++

      const kids = children[id] || []
      // 第一个子节点继续同列（主路径），其余进入分支列
      kids.forEach((kid, i) => {
        if (!visited.has(kid) && stepIdSet.has(kid)) {
          if (i === 0) {
            queue.unshift(kid)  // 主路径优先
          } else {
            queue.push(kid)      // 分支后排
          }
        }
      })
    }
  }

  // 主列遍历
  if (startNodes.length > 0) {
    bfs(startNodes[0], 0)
  }

  // 分支：对于主列节点的非第一个子节点（还未访问的），放到右列
  for (const [fromId, kids] of Object.entries(children)) {
    if (!visited.has(fromId)) continue
    kids.forEach((kid, i) => {
      if (i > 0 && !visited.has(kid) && stepIdSet.has(kid)) {
        // 分支节点放到右列，行号从父节点的行开始递增
        const savedRow = currentRow
        bfs(kid, 1)
        // 计算分支的行偏移
        const parentRow = row[fromId]
        if (parentRow !== undefined && row[kid] !== undefined) {
          // 分支放在父节点下方
        }
      }
    })
  }

  // 处理剩余未访问的孤立节点（无父且不在roots中，或有父但父不在steps中）
  for (const step of flowSteps) {
    if (!visited.has(step.id)) {
      col[step.id] = 0
      row[step.id] = currentRow++
      visited.add(step.id)
    }
  }

  const maxRow = currentRow > 0 ? currentRow : 1
  return { col, row, maxRow }
}

export default function FlowChart({ flowSteps, flowEdges }) {
  const { positions, svgLines, totalHeight, totalWidth } = useMemo(() => {
    if (!flowSteps || flowSteps.length === 0 || !flowEdges || flowEdges.length === 0) {
      return { positions: [], svgLines: [], totalHeight: 0, totalWidth: 0 }
    }

    const { col, row, maxRow } = assignColumns(flowSteps, flowEdges)

    // 计算每个节点的实际像素位置
    const positions = flowSteps.map((step) => {
      const r = row[step.id] ?? 0
      const c = col[step.id] ?? 0
      return {
        id: step.id,
        label: step.label,
        x: c * (NODE_W + 80),  // column offset
        y: r * (NODE_H + GAP_Y),
        w: NODE_W,
        h: NODE_H,
      }
    })

    const posMap = {}
    positions.forEach((p) => { posMap[p.id] = p })

    // 生成 SVG 连线
    const svgLines = flowEdges.map(({ from, to }, i) => {
      const a = posMap[from]
      const b = posMap[to]
      if (!a || !b) return null

      // 起点：a 的底部中央
      const x1 = a.x + a.w / 2
      const y1 = a.y + a.h
      // 终点：b 的顶部中央
      const x2 = b.x + b.w / 2
      const y2 = b.y

      // 贝塞尔曲线
      const cy1 = y1 + (y2 - y1) * 0.4
      const cy2 = y2 - (y2 - y1) * 0.4
      const d = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`

      return { key: `${from}-${to}-${i}`, d }
    }).filter(Boolean)

    const totalHeight = (maxRow || 1) * (NODE_H + GAP_Y) - GAP_Y
    const totalWidth = 2 * (NODE_W + 80)  // 最多2列

    return { positions, svgLines, totalHeight, totalWidth }
  }, [flowSteps, flowEdges])

  if (!flowSteps || flowSteps.length === 0) {
    return (
      <div className={styles.empty}>
        <p>暂无流程数据</p>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.heading}>
        <GitBranch size={20} color="#7e57c2" />
        <h2 className={styles.title}>核心流程</h2>
      </div>

      <div
        className={styles.canvas}
        style={{ height: totalHeight, minHeight: 100 }}
      >
        {/* SVG 连线层 */}
        <svg
          className={styles.svgLayer}
          width={totalWidth}
          height={totalHeight}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {svgLines.map((line) => (
            <path
              key={line.key}
              d={line.d}
              fill="none"
              stroke="#b39ddb"
              strokeWidth="2"
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
            />
          ))}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#b39ddb" />
            </marker>
          </defs>
        </svg>

        {/* 节点层 */}
        {positions.map((pos) => (
          <div
            key={pos.id}
            className={styles.node}
            style={{
              left: pos.x,
              top: pos.y,
              width: pos.w,
              minHeight: pos.h,
            }}
          >
            <span className={styles.nodeLabel}>
              {pos.label.split('\n').map((line, i) => (
                <span key={i}>{line}<br /></span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
