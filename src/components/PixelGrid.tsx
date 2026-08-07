'use client'

/**
 * PixelGrid - the shared 1000 x 1000 wall renderer.
 *
 * Everything is painted on a single <canvas>, so 10,000 blocks cost zero DOM
 * nodes. Used in two modes:
 *   mode="read"   -> Home. Hover tooltip + click through to the owner's link.
 *   mode="select" -> /buy. Click-and-drag rectangular selection.
 *
 * Zoom / pan works with the wheel, pinch gestures, and the on-screen controls.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CANVAS_HEIGHT, CANVAS_WIDTH, GRID } from '@/lib/config'
import type { LiveBlock } from '@/lib/blocks'

export type Selection = { x: number; y: number; width: number; height: number }

type PixelGridProps = {
	mode: 'read' | 'select'
	blocks: LiveBlock[]
	/** Occupied cells encoded as y * columns + x. Only needed in select mode. */
	occupied?: Set<number>
	selection?: Selection | null
	onSelectionChange?: (selection: Selection | null) => void
	onSelectionRejected?: (message: string) => void
}

const MIN_SCALE = 1
const MAX_SCALE = 8
const BLOCK = GRID.blockPixelSize

function cellKey(x: number, y: number) {
	return y * GRID.columns + x
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value))
}

export function PixelGrid({
	mode,
	blocks,
	occupied,
	selection = null,
	onSelectionChange,
	onSelectionRejected,
}: PixelGridProps) {
	const wrapRef = useRef<HTMLDivElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map())
	const dragRef = useRef<{ startX: number; startY: number } | null>(null)
	const panRef = useRef<{ pointerX: number; pointerY: number } | null>(null)
	const pinchRef = useRef<{ distance: number; scale: number } | null>(null)
	const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())

	const [view, setView] = useState({ scale: 1, offsetX: 0, offsetY: 0 })
	const [hover, setHover] = useState<{
		block: LiveBlock
		left: number
		top: number
	} | null>(null)
	const [ready, setReady] = useState(0)
	const [focusCell, setFocusCell] = useState({ x: 0, y: 0 })

	/* ---------------------------------------------------------------- images */
	useEffect(() => {
		let cancelled = false
		blocks.forEach((block) => {
			if (imagesRef.current.has(block.id)) return
			const image = new Image()
			image.crossOrigin = 'anonymous'
			image.decoding = 'async'
			image.onload = () => {
				if (!cancelled) setReady((value) => value + 1)
			}
			image.onerror = () => {
				if (!cancelled) setReady((value) => value + 1)
			}
			image.src = block.imageUrl
			imagesRef.current.set(block.id, image)
		})
		return () => {
			cancelled = true
		}
	}, [blocks])

	/* ----------------------------------------------------------------- paint */
	const draw = useCallback(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const dpr = Math.min(window.devicePixelRatio || 1, 2)
		if (canvas.width !== CANVAS_WIDTH * dpr) {
			canvas.width = CANVAS_WIDTH * dpr
			canvas.height = CANVAS_HEIGHT * dpr
		}

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
		ctx.save()
		ctx.translate(view.offsetX, view.offsetY)
		ctx.scale(view.scale, view.scale)

		// empty wall background
		ctx.fillStyle = '#FFFFFF'
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

		// faint grid lines (every 10 blocks stronger)
		const lineStep = BLOCK
		ctx.lineWidth = 1 / view.scale
		for (let i = 0; i <= GRID.columns; i += 1) {
			const isMajor = i % 10 === 0
			if (view.scale < 2 && !isMajor) continue
			ctx.strokeStyle = isMajor ? '#E6E5E3' : '#F2F1EF'
			ctx.beginPath()
			ctx.moveTo(i * lineStep, 0)
			ctx.lineTo(i * lineStep, CANVAS_HEIGHT)
			ctx.stroke()
			ctx.beginPath()
			ctx.moveTo(0, i * lineStep)
			ctx.lineTo(CANVAS_WIDTH, i * lineStep)
			ctx.stroke()
		}

		// sold / taken blocks
		blocks.forEach((block) => {
			const image = imagesRef.current.get(block.id)
			const px = block.x * BLOCK
			const py = block.y * BLOCK
			const pw = block.width * BLOCK
			const ph = block.height * BLOCK
			if (image && image.complete && image.naturalWidth > 0) {
				// stretched to cover the whole purchased rectangle, like the original site
				ctx.drawImage(image, px, py, pw, ph)
			} else {
				ctx.fillStyle = '#F9F8F7'
				ctx.fillRect(px, py, pw, ph)
				ctx.strokeStyle = '#E6E5E3'
				ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1)
			}
		})

		// cells that are taken but not renderable on this surface (buy page)
		if (mode === 'select' && occupied) {
			const rendered = new Set<number>()
			blocks.forEach((block) => {
				for (let dy = 0; dy < block.height; dy += 1) {
					for (let dx = 0; dx < block.width; dx += 1) {
						rendered.add(cellKey(block.x + dx, block.y + dy))
					}
				}
			})
			ctx.fillStyle = 'rgba(125, 122, 117, 0.35)'
			occupied.forEach((key) => {
				if (rendered.has(key)) return
				const x = key % GRID.columns
				const y = Math.floor(key / GRID.columns)
				ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK)
			})
		}

		// selection overlay
		if (mode === 'select' && selection) {
			ctx.fillStyle = 'rgba(39, 131, 222, 0.28)'
			ctx.fillRect(
				selection.x * BLOCK,
				selection.y * BLOCK,
				selection.width * BLOCK,
				selection.height * BLOCK,
			)
			ctx.strokeStyle = '#2783DE'
			ctx.lineWidth = 2 / view.scale
			ctx.strokeRect(
				selection.x * BLOCK,
				selection.y * BLOCK,
				selection.width * BLOCK,
				selection.height * BLOCK,
			)
		}

		// keyboard focus cursor
		if (mode === 'select') {
			ctx.strokeStyle = '#2C2C2B'
			ctx.lineWidth = 1.5 / view.scale
			ctx.strokeRect(focusCell.x * BLOCK, focusCell.y * BLOCK, BLOCK, BLOCK)
		}

		ctx.restore()
	}, [blocks, focusCell, mode, occupied, ready, selection, view])

	useEffect(() => {
		draw()
	}, [draw])

	useEffect(() => {
		const handleResize = () => draw()
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [draw])

	/* ------------------------------------------------------------ geometry */
	const toCell = useCallback(
		(clientX: number, clientY: number) => {
			const wrap = wrapRef.current
			if (!wrap) return null
			const rect = wrap.getBoundingClientRect()
			const cssToCanvas = CANVAS_WIDTH / rect.width
			const canvasX = (clientX - rect.left) * cssToCanvas
			const canvasY = (clientY - rect.top) * cssToCanvas
			const worldX = (canvasX - view.offsetX) / view.scale
			const worldY = (canvasY - view.offsetY) / view.scale
			const x = Math.floor(worldX / BLOCK)
			const y = Math.floor(worldY / BLOCK)
			if (x < 0 || y < 0 || x >= GRID.columns || y >= GRID.rows) return null
			return { x, y }
		},
		[view],
	)

	const blockAt = useCallback(
		(x: number, y: number) =>
			blocks.find(
				(block) =>
					x >= block.x &&
					x < block.x + block.width &&
					y >= block.y &&
					y < block.y + block.height,
			) ?? null,
		[blocks],
	)

	const rectFrom = (ax: number, ay: number, bx: number, by: number): Selection => ({
		x: Math.min(ax, bx),
		y: Math.min(ay, by),
		width: Math.abs(bx - ax) + 1,
		height: Math.abs(by - ay) + 1,
	})

	const overlapsTaken = useCallback(
		(rect: Selection) => {
			if (!occupied) return false
			for (let y = rect.y; y < rect.y + rect.height; y += 1) {
				for (let x = rect.x; x < rect.x + rect.width; x += 1) {
					if (occupied.has(cellKey(x, y))) return true
				}
			}
			return false
		},
		[occupied],
	)

	const clampView = useCallback((next: { scale: number; offsetX: number; offsetY: number }) => {
		const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE)
		const maxOffset = 0
		const minOffsetX = CANVAS_WIDTH - CANVAS_WIDTH * scale
		const minOffsetY = CANVAS_HEIGHT - CANVAS_HEIGHT * scale
		return {
			scale,
			offsetX: clamp(next.offsetX, minOffsetX, maxOffset),
			offsetY: clamp(next.offsetY, minOffsetY, maxOffset),
		}
	}, [])

	const zoomAt = useCallback(
		(factor: number, anchorCanvasX = CANVAS_WIDTH / 2, anchorCanvasY = CANVAS_HEIGHT / 2) => {
			setView((current) => {
				const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE)
				const ratio = scale / current.scale
				return clampView({
					scale,
					offsetX: anchorCanvasX - (anchorCanvasX - current.offsetX) * ratio,
					offsetY: anchorCanvasY - (anchorCanvasY - current.offsetY) * ratio,
				})
			})
		},
		[clampView],
	)

	/* ------------------------------------------------------------- pointers */
	const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
		pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
		event.currentTarget.setPointerCapture(event.pointerId)

		if (pointers.current.size === 2) {
			const [a, b] = Array.from(pointers.current.values())
			pinchRef.current = {
				distance: Math.hypot(a.x - b.x, a.y - b.y),
				scale: view.scale,
			}
			dragRef.current = null
			return
		}

		if (mode === 'select' && !event.shiftKey) {
			const cell = toCell(event.clientX, event.clientY)
			if (!cell) return
			if (occupied?.has(cellKey(cell.x, cell.y))) {
				onSelectionRejected?.('That block is already taken. Pick a free area of the wall.')
				return
			}
			dragRef.current = { startX: cell.x, startY: cell.y }
			setFocusCell(cell)
			onSelectionChange?.({ x: cell.x, y: cell.y, width: 1, height: 1 })
		} else {
			panRef.current = { pointerX: event.clientX, pointerY: event.clientY }
		}
	}

	const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (pointers.current.has(event.pointerId)) {
			pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
		}

		// pinch zoom
		if (pointers.current.size === 2 && pinchRef.current) {
			const [a, b] = Array.from(pointers.current.values())
			const distance = Math.hypot(a.x - b.x, a.y - b.y)
			const factor = distance / pinchRef.current.distance
			setView((current) =>
				clampView({
					...current,
					scale: clamp(pinchRef.current!.scale * factor, MIN_SCALE, MAX_SCALE),
				}),
			)
			return
		}

		// pan
		if (panRef.current) {
			const wrap = wrapRef.current
			if (!wrap) return
			const rect = wrap.getBoundingClientRect()
			const cssToCanvas = CANVAS_WIDTH / rect.width
			const dx = (event.clientX - panRef.current.pointerX) * cssToCanvas
			const dy = (event.clientY - panRef.current.pointerY) * cssToCanvas
			panRef.current = { pointerX: event.clientX, pointerY: event.clientY }
			setView((current) =>
				clampView({ ...current, offsetX: current.offsetX + dx, offsetY: current.offsetY + dy }),
			)
			return
		}

		// drag select
		if (mode === 'select' && dragRef.current) {
			const cell = toCell(event.clientX, event.clientY)
			if (!cell) return
			const rect = rectFrom(dragRef.current.startX, dragRef.current.startY, cell.x, cell.y)
			if (overlapsTaken(rect)) {
				onSelectionRejected?.(
					'Your selection overlaps blocks that are already taken. Selections must be a clear rectangle.',
				)
				return
			}
			setFocusCell(cell)
			onSelectionChange?.(rect)
			return
		}

		// hover tooltip (read mode)
		if (mode === 'read') {
			const cell = toCell(event.clientX, event.clientY)
			const wrap = wrapRef.current
			if (!cell || !wrap) {
				setHover(null)
				return
			}
			const block = blockAt(cell.x, cell.y)
			if (!block) {
				setHover(null)
				return
			}
			const rect = wrap.getBoundingClientRect()
			setHover({
				block,
				left: clamp(event.clientX - rect.left + 12, 8, Math.max(8, rect.width - 260)),
				top: clamp(event.clientY - rect.top + 12, 8, Math.max(8, rect.height - 80)),
			})
		}
	}

	const endPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
		pointers.current.delete(event.pointerId)
		if (pointers.current.size < 2) pinchRef.current = null
		dragRef.current = null
		panRef.current = null
	}

	const onClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
		if (mode !== 'read') return
		const cell = toCell(event.clientX, event.clientY)
		if (!cell) return
		const block = blockAt(cell.x, cell.y)
		if (!block || !block.linkUrl) return
		const win = window.open(block.linkUrl, '_blank', 'noopener,noreferrer')
		if (win) win.opener = null
		// fire-and-forget click analytics
		void fetch(`/api/blocks/${block.id}/click`, { method: 'POST', keepalive: true }).catch(
			() => undefined,
		)
	}

	const onWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
		if (!event.ctrlKey && !event.metaKey && view.scale === 1) return
		event.preventDefault()
		const wrap = wrapRef.current
		if (!wrap) return
		const rect = wrap.getBoundingClientRect()
		const cssToCanvas = CANVAS_WIDTH / rect.width
		zoomAt(
			event.deltaY < 0 ? 1.15 : 1 / 1.15,
			(event.clientX - rect.left) * cssToCanvas,
			(event.clientY - rect.top) * cssToCanvas,
		)
	}

	/* ------------------------------------------------------------ keyboard */
	const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
		const step = event.shiftKey ? 10 : 1
		const move = (dx: number, dy: number) => {
			event.preventDefault()
			setFocusCell((cell) => ({
				x: clamp(cell.x + dx, 0, GRID.columns - 1),
				y: clamp(cell.y + dy, 0, GRID.rows - 1),
			}))
		}

		switch (event.key) {
			case 'ArrowLeft':
				return move(-step, 0)
			case 'ArrowRight':
				return move(step, 0)
			case 'ArrowUp':
				return move(0, -step)
			case 'ArrowDown':
				return move(0, step)
			case '+':
			case '=':
				event.preventDefault()
				return zoomAt(1.25)
			case '-':
				event.preventDefault()
				return zoomAt(1 / 1.25)
			case '0':
				event.preventDefault()
				return setView({ scale: 1, offsetX: 0, offsetY: 0 })
			case 'Enter':
			case ' ': {
				event.preventDefault()
				if (mode === 'read') {
					const block = blockAt(focusCell.x, focusCell.y)
					if (block && block.linkUrl) window.open(block.linkUrl, '_blank', 'noopener,noreferrer')
					return
				}
				// select mode: extend the current selection to the focused cell
				if (!selection) {
					if (occupied?.has(cellKey(focusCell.x, focusCell.y))) {
						onSelectionRejected?.('That block is already taken.')
						return
					}
					onSelectionChange?.({ x: focusCell.x, y: focusCell.y, width: 1, height: 1 })
					return
				}
				const rect = rectFrom(selection.x, selection.y, focusCell.x, focusCell.y)
				if (overlapsTaken(rect)) {
					onSelectionRejected?.('Your selection overlaps blocks that are already taken.')
					return
				}
				onSelectionChange?.(rect)
				return
			}
			case 'Escape':
				if (mode === 'select') onSelectionChange?.(null)
				return
			default:
				return
		}
	}

	const ariaLabel = useMemo(
		() =>
			mode === 'read'
				? `The wall: ${GRID.columns} by ${GRID.rows} blocks, ${blocks.length} sold blocks. Use arrow keys to move and Enter to open a block's link.`
				: `Block selector: ${GRID.columns} by ${GRID.rows} grid. Arrow keys move the cursor (hold Shift for 10 blocks), Enter starts or extends the selection, Escape clears it.`,
		[blocks.length, mode],
	)

	return (
		<div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
			<div
				ref={wrapRef}
				className={`grid-wrap${mode === 'select' ? ' grid-wrap--interactive' : ''}`}
			>
				<canvas
					ref={canvasRef}
					className="grid-canvas"
					role={mode === 'read' ? 'img' : 'application'}
					aria-label={ariaLabel}
					tabIndex={0}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={endPointer}
					onPointerCancel={endPointer}
					onPointerLeave={() => setHover(null)}
					onClick={onClick}
					onWheel={onWheel}
					onKeyDown={onKeyDown}
				/>
				{hover && (
					<div className="grid-tooltip" style={{ left: hover.left, top: hover.top }} role="status">
						{/* React escapes these values; they are also sanitized on write */}
						<div className="grid-tooltip__name">{hover.block.buyerName}</div>
						<div className="grid-tooltip__desc">{hover.block.description}</div>
					</div>
				)}
			</div>

			<div className="grid-controls">
				<button
					type="button"
					className="button button--sm"
					onClick={() => zoomAt(1 / 1.25)}
					aria-label="Zoom out"
				>
					&minus;
				</button>
				<span aria-live="polite">{Math.round(view.scale * 100)}%</span>
				<button
					type="button"
					className="button button--sm"
					onClick={() => zoomAt(1.25)}
					aria-label="Zoom in"
				>
					+
				</button>
				<button
					type="button"
					className="button button--sm"
					onClick={() => setView({ scale: 1, offsetX: 0, offsetY: 0 })}
				>
					Reset
				</button>
				<span>
					{mode === 'select'
						? 'Drag to select. Shift + drag to pan.'
						: 'Pinch or scroll to zoom, drag to pan.'}
				</span>
			</div>
		</div>
	)
}
